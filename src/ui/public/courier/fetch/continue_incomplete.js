import { RequestStatus } from './req_status';

export function ContinueIncompleteProvider() {
  const INCOMPLETE = RequestStatus.INCOMPLETE;

  function continueIncompleteRequests(requests, responses, fetchSearchResults) {
    const incomplete = [];

    responses.forEach(function (resp, i) {
      if (resp === INCOMPLETE) {
        incomplete.push(requests[i]);
      }
    });

    if (!incomplete.length) return responses;

    return fetchSearchResults(incomplete)
      .then(function (completedResponses) {
        return responses.map(function (prevResponse) {
          if (prevResponse !== INCOMPLETE) return prevResponse;
          return completedResponses.shift();
        });
      });
  }

  return continueIncompleteRequests;
}
