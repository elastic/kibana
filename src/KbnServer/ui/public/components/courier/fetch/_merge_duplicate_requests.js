define(function (require) {
  return function FetchMergeDuplicateRequests(Private) {
    var isRequest = Private(require('components/courier/fetch/_is_request'));
    var DUPLICATE = Private(require('components/courier/fetch/_req_status')).DUPLICATE;

    function mergeDuplicateRequests(requests) {
      // dedupe requests
      var index = {};
      return requests.map(function (req) {
        if (!isRequest(req)) return req;

        var iid = req.source._instanceid;
        if (!index[iid]) {
          // this request is unique so far
          index[iid] = req;
          // keep the request
          return req;
        }

        // the source was requested at least twice
        req._uniq = index[iid];
        return DUPLICATE;
      });
    }

    return mergeDuplicateRequests;
  };
});