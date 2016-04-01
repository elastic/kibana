define(function (require) {
  return function FetchMergeDuplicateRequests(Private) {
    let isRequest = Private(require('ui/courier/fetch/_is_request'));
    let DUPLICATE = Private(require('ui/courier/fetch/_req_status')).DUPLICATE;

    function mergeDuplicateRequests(requests) {
      // dedupe requests
      let index = {};
      return requests.map(function (req) {
        if (!isRequest(req)) return req;

        let iid = req.source._instanceid;
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
