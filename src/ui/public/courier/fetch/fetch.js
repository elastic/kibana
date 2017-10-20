import _ from 'lodash';
import { requestQueue } from '../_request_queue';
import { FetchTheseProvider } from './fetch_these';

export function FetchProvider(Private, Promise) {

  const immediatelyFetchThese = Private(FetchTheseProvider);

  const debouncedFetchThese = _.debounce(() => {
    const requests = requestQueue.filter(req => req.isFetchRequestedAndPending());
    immediatelyFetchThese(requests);
  }, {
    wait: 10,
    maxWait: 50
  });

  /**
   * Fetch a list of requests
   * @param {array} reqs - the requests to fetch
   * @async
   */
  this.these = (requests) => {
    requests.forEach(req => req._setFetchRequested());
    debouncedFetchThese();
    return Promise.all(requests.map(req => req.getCompletePromise()));
  };

  this.fetchQueued = () => {
    return this.these(requestQueue.getStartable());
  };
}
