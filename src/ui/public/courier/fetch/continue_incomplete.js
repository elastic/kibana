import ReqStatusProvider from './req_status';

export default function CourierFetchContinueIncompleteRequests(Private) {
  const INCOMPLETE = Private(ReqStatusProvider).INCOMPLETE;

  function continueIncompleteRequests(strategy, requests, responses, fetchWithStrategy) {
    const incomplete = [];

    responses.forEach(function (resp, i) {
      if (resp === INCOMPLETE) {
        incomplete.push(requests[i]);
      }
    });

    if (!incomplete.length) return responses;

    return fetchWithStrategy(strategy, incomplete)
    .then(function (completedResponses) {
      return responses.map(function (prevResponse) {
        if (prevResponse !== INCOMPLETE) return prevResponse;
        return completedResponses.shift();
      });
    });
  }

  return continueIncompleteRequests;
}
