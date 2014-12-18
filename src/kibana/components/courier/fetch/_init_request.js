define(function (require) {
  return function FetchInitRequestProvider() {
    var moment = require('moment');

    function initRequest(req) {
      if (req.source.activeFetchCount) {
        req.source.activeFetchCount += 1;
      } else {
        req.source.activeFetchCount = 1;
      }

      req.moment = moment();
    }

    return initRequest;
  };
});