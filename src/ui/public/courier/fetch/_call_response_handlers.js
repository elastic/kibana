import { SearchTimeout } from 'ui/errors';
import { RequestFailure } from 'ui/errors';
import { ShardFailure } from 'ui/errors';
import CourierFetchReqStatusProvider from 'ui/courier/fetch/_req_status';
import CourierFetchNotifierProvider from 'ui/courier/fetch/_notifier';
export default function CourierFetchCallResponseHandlers(Private, Promise) {
  var ABORTED = Private(CourierFetchReqStatusProvider).ABORTED;
  var INCOMPLETE = Private(CourierFetchReqStatusProvider).INCOMPLETE;
  var notify = Private(CourierFetchNotifierProvider);


  function callResponseHandlers(requests, responses) {
    return Promise.map(requests, function (req, i) {
      if (req === ABORTED || req.aborted) {
        return ABORTED;
      }

      var resp = responses[i];

      if (resp.timed_out) {
        notify.warning(new SearchTimeout());
      }

      if (resp._shards && resp._shards.failed) {
        notify.warning(new ShardFailure(resp));
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

      return Promise.try(function () {
        return req.transformResponse(resp);
      })
      .then(function () {
        resp = arguments[0];
        return req.handleResponse(resp);
      })
      .then(progress);
    });
  }

  return callResponseHandlers;
};
