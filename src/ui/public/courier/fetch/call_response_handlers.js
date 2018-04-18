import { RequestFailure, SearchTimeout, ShardFailure } from '../../errors';

import { RequestStatus } from './req_status';
import { courierNotifier } from './notifier';

export function CallResponseHandlersProvider(Private, Promise) {
  const ABORTED = RequestStatus.ABORTED;
  const INCOMPLETE = RequestStatus.INCOMPLETE;

  function callResponseHandlers(requests, responses) {
    return Promise.map(requests, function (req, i) {
      if (req === ABORTED || req.aborted) {
        return ABORTED;
      }

      const resp = responses[i];

      if (resp.timed_out) {
        courierNotifier.warning(new SearchTimeout());
      }

      if (resp._shards && resp._shards.failed) {
        courierNotifier.warning(new ShardFailure(resp));
      }

      function progress() {
        if (req.isIncomplete()) {
          return INCOMPLETE;
        }

        req.complete();
        return resp;
      }

      if (resp.error) {
        if (req.filterError(resp)) {
          return progress();
        } else {
          return req.handleFailure(new RequestFailure(null, resp));
        }
      }

      return Promise.try(() => req.handleResponse(resp)).then(progress);
    });
  }

  return callResponseHandlers;
}
