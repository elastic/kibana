define(function (require) {
  return function CourierFetchCallResponseHandlers(Private, Promise) {
    let ABORTED = Private(require('ui/courier/fetch/_req_status')).ABORTED;
    let INCOMPLETE = Private(require('ui/courier/fetch/_req_status')).INCOMPLETE;
    let notify = Private(require('ui/courier/fetch/_notifier'));

    let SearchTimeout = require('ui/errors').SearchTimeout;
    let RequestFailure = require('ui/errors').RequestFailure;
    let ShardFailure = require('ui/errors').ShardFailure;

    function callResponseHandlers(requests, responses) {
      return Promise.map(requests, function (req, i) {
        if (req === ABORTED || req.aborted) {
          return ABORTED;
        }

        let resp = responses[i];

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
});
