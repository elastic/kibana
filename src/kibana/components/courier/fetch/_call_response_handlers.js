define(function (require) {
  return function CourierFetchCallResponseHandlers(Private, Promise) {
    var ABORTED = Private(require('components/courier/fetch/_req_status')).ABORTED;
    var INCOMPLETE = Private(require('components/courier/fetch/_req_status')).INCOMPLETE;
    var notify = Private(require('components/courier/fetch/_notifier'));

    var SearchTimeout = require('errors').SearchTimeout;
    var RequestFailure = require('errors').RequestFailure;

    function callResponseHandlers(strategy, requests, responses) {
      return Promise.map(requests, function (req, i) {
        var resp = responses[i];

        if (req === ABORTED || req.aborted) {
          return ABORTED;
        }

        if (resp.timed_out) {
          notify.warning(new SearchTimeout());
        }

        if (resp.error) {
          return req.handleFailure(new RequestFailure(null, resp));
        }

        return Promise.try(function () {
          return req.transformResponse(resp);
        })
        .then(function () {
          resp = arguments[0];
          return req.handleResponse(resp);
        })
        .then(function () {
          if (req.isIncomplete()) {
            return INCOMPLETE;
          }

          req.complete();
          return resp;
        });
      });
    }

    return callResponseHandlers;
  };
});