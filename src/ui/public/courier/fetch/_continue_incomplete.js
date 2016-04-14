define(function (require) {
  return function CourierFetchContinueIncompleteRequests(Private) {
    let INCOMPLETE = Private(require('ui/courier/fetch/_req_status')).INCOMPLETE;

    function continueIncompleteRequests(strategy, requests, responses, fetchWithStrategy) {
      let incomplete = [];

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
  };
});
