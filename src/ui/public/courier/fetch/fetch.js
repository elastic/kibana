import _ from 'lodash';

import { RequestQueueProvider } from '../_request_queue';
import { FetchTheseProvider } from './fetch_these';
import { CallResponseHandlersProvider } from './call_response_handlers';
import { ReqStatusProvider } from './req_status';

export function FetchProvider(Private, Promise) {

  const requestQueue = Private(RequestQueueProvider);
  const immediatelyFetchThese = Private(FetchTheseProvider);
  const callResponseHandlers = Private(CallResponseHandlersProvider);
  const INCOMPLETE = Private(ReqStatusProvider).INCOMPLETE;

  const debouncedFetchThese = _.debounce(() => {
    const requests = requestQueue.get().filter(req => req.isFetchRequestedAndPending());
    immediatelyFetchThese(requests);
  }, {
    wait: 10,
    maxWait: 50
  });

  const fetchTheseSoon = (requests) => {
    requests.forEach(req => req._setFetchRequested());
    debouncedFetchThese();
    return Promise.all(requests.map(req => req.getCompletePromise()));
  };

  this.fetchQueued = (strategy) => {
    return fetchTheseSoon(requestQueue.getStartable(strategy));
  };

  function fetchASource(source) {
    const defer = Promise.defer();

    fetchTheseSoon([
      source._createRequest(defer)
    ]);

    return defer.promise;
  }

  /**
   * Fetch a single doc source
   * @param {DocSource} source - The DocSource to request
   * @async
   */
  this.doc = fetchASource;

  /**
   * Fetch a single search source
   * @param {SearchSource} source - The SearchSource to request
   * @async
   */
  this.search = fetchASource;

  /**
   * Fetch a list of requests
   * @param {array} reqs - the requests to fetch
   * @async
   */
  this.these = fetchTheseSoon;

  /**
   * Send responses to a list of requests, used when requests
   * should be skipped (like when a doc is updated with an index).
   *
   * This logic is a simplified version of what fetch_these does, and
   * could have been added elsewhere, but I would rather the logic be
   * here than outside the courier/fetch module.
   *
   * @param {array[Request]} requests - the list of requests to respond to
   * @param {array[any]} responses - the list of responses for each request
   */
  this.fakeFetchThese = function (requests, responses) {
    return Promise.map(requests, function (req) {
      return req.start();
    })
    .then(function () {
      return callResponseHandlers(requests, responses);
    })
    .then(function (requestStates) {
      if (_.contains(requestStates, INCOMPLETE)) {
        throw new Error('responding to requests did not complete!');
      }
    });
  };
}
