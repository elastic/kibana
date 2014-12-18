define(function (require) {
  return function FetchRequestCompleteProvider(Private, Notifier) {
    var errors = require('errors');
    var requestErrorHandler = Private(require('components/courier/fetch/_request_error_handler'));

    var notify = new Notifier({
      location: 'Courier Fetch'
    });

    function reqComplete(req, resp) {
      if (resp.timed_out) {
        notify.warning(new errors.SearchTimeout());
      }

      req.complete = true;
      req.resp = resp;
      req.ms = req.moment.diff() * -1;
      req.source.activeFetchCount -= 1;

      if (resp.error) {
        return requestErrorHandler(req, new errors.FetchFailure(resp));
      }

      return req.strategy.resolveRequest(req, resp);
    }

    return reqComplete;
  };
});