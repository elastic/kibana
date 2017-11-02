import _ from 'lodash';
import { requestQueue } from '../_request_queue';
import { FetchNowProvider } from './fetch_now';

/**
 * This is usually the right fetch provider to use, rather than FetchNowProvider, as this class introduces
 * a slight delay in the request process to allow multiple requests to queue up (e.g. when a dashboard
 * is loading).
 *
 * @param Private
 * @param Promise
 * @constructor
 */
export function FetchSoonProvider(Private, Promise) {

  const fetchNow = Private(FetchNowProvider);

  const debouncedFetchNow = _.debounce(() => {
    const requests = requestQueue.filter(req => req.isFetchRequestedAndPending());
    fetchNow(requests);
  }, {
    wait: 10,
    maxWait: 50
  });

  /**
   * Fetch a list of requests
   * @param {array} requests - the requests to fetch
   * @async
   */
  this.these = (requests) => {
    requests.forEach(req => req._setFetchRequested());
    debouncedFetchNow();
    return Promise.all(requests.map(req => req.getCompletePromise()));
  };

  this.fetchQueued = () => {
    return this.these(requestQueue.getStartable());
  };
}
