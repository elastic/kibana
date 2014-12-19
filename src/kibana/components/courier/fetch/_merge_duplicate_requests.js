define(function (require) {
  return function FetchMergeDuplicateRequests() {

    function mergeDuplicateRequests(requests) {
      // dedupe requests
      var index = {};
      return requests.filter(function (req) {
        var iid = req.source._instanceid;
        if (!index[iid]) {
          // this request is unique so far
          index[iid] = req;
          // keep the request
          return true;
        }

        // the source was requested at least twice
        var uniq = index[iid];
        if (uniq._merged) {
          // already setup the merged list
          uniq._merged.push(req);
        } else {
          // put all requests into this array and itterate them on response
          uniq._merged = [uniq, req];
        }
      });
    }

    return mergeDuplicateRequests;
  };
});