import Rx from 'rxjs/Rx';
import { once } from 'lodash';

const PENDING = Symbol('scroll id to clear is pending');

/**
 *  Creates an Observable that emits search responses until
 *  the result set is exhausted.
 *
 *  To get multiple search results scrolling must be used. To
 *  enable this pass `searchParams.scroll` or `searchParams.body.scroll`
 *
 *  If scrolling is used:
 *   - the size of each result is controlled with `searchParams.size` or
 *    `searchParams.body.size`.
 *   - the search will be properly closed in Elasticsearch
 *     - when the observer unsubscribes, OR
 *     - once all results are consumed, before emitting "complete", OR
 *     - when there is a request error, before emitting "error"
 *
 *  @param {Object} searchParams parameters for the Elasticsearch search API
 *  @param {Function} callCluster function to send requests to Elasticsearch
 *  @return {Rx<SearchResponse>}
 */
export function createSearchResponse$(searchParams, callCluster) {
  return Rx.Observable.create((observer) => {
    const scrollTimeout = searchParams.scroll || (searchParams.body && searchParams.body.scroll);
    const scrollIdToClear$ = new Rx.BehaviorSubject();

    // clears scroll on first subscription, waits for
    // scrollIdToClear$ if the request with our scroll
    // id is pending, completes when scroll is cleared
    const clearScroll$ = Rx.Observable.defer(once(() => (
      scrollIdToClear$
        .first(value => value !== PENDING)
        .mergeMap(async scrollId => {
          if (scrollId) {
            await callCluster('clearScroll', {
              body: {
                scroll_id: scrollId
              }
            });
          }
        })
        .toPromise()
    )))
    .ignoreElements();

    // queue of all requests to process. Queuing ensures that
    // we process every request separately so that we:
    //  - don't accidentally keep responses in memory
    //  - notify observer before stating next request
    //  - don't start requests unless observer is still subscribed
    const response$$ = new Rx.Subject();

    // create a request for the queue, when subscribed it will
    // execute the request and queue more requests based on the response
    function createResponse$(head, method, params) {
      return Rx.Observable.defer(async () => {
        const promise = Promise.resolve(callCluster(method, params));

        if (!scrollIdToClear$.getValue()) {
          scrollIdToClear$.next(PENDING);
          await promise
            .then(resp => scrollIdToClear$.next(resp._scroll_id))
            .catch(() => scrollIdToClear$.next(null));
        }

        const resp = await promise;
        const scrollId = resp._scroll_id;
        const { total, hits } = resp.hits;
        const tail = head + hits.length;
        if (scrollId && tail < total) {
          response$$.next(createResponse$(tail, 'scroll', {
            body: {
              scroll: scrollTimeout,
              scroll_id: scrollId
            }
          }));
        } else {
          response$$.complete();
        }

        return resp;
      });
    }

    observer.add(
      response$$
        // convert request queue into a single observable of responses
        .mergeAll(1)
        // subscribe to clearScroll$ on error but only emit original error
        .catch(error => (
          clearScroll$
            .catch(Rx.Observable.empty)
            .concat(Rx.Observable.throw(error))
        ))
        // subscribe to clearScroll$ on complete
        .concat(clearScroll$)
        // send responses to the observer
        .subscribe(observer)
    );

    // ensure we clearScroll$ if response$ doesn't complete/error
    observer.add(() => clearScroll$.subscribe());

    // queue initial request
    response$$.next(createResponse$(0, 'search', searchParams));
  });
}
