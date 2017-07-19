import { IsRequestProvider } from './is_request';
import { ReqStatusProvider } from './req_status';

export function MergeDuplicatesRequestProvider(Private) {
  const isRequest = Private(IsRequestProvider);
  const DUPLICATE = Private(ReqStatusProvider).DUPLICATE;

  function mergeDuplicateRequests(requests) {
    // dedupe requests
    const index = {};
    return requests.map(function (req) {
      if (!isRequest(req)) return req;

      const iid = req.source._instanceid;
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
}
