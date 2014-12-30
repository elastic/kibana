define(function (require) {
  return function FetchStrategyForDoc(Promise) {
    return {
      clientMethod: 'mget',

      /**
       * Flatten a series of requests into as ES request body
       * @param  {array} requests - an array of flattened requests
       * @return {string} - the request body
       */
      convertReqsToBody: function (reqs) {
        return Promise.map(reqs, function (req) {
          return req.getFetchParams();
        })
        .then(function (reqsParams) {
          return {
            docs: reqsParams
          };
        });
      },

      /**
       * Fetch the multiple responses from the ES Response
       * @param  {object} resp - The response sent from Elasticsearch
       * @return {array} - the list of responses
       */
      getResponses: function (resp) {
        return resp.docs;
      }
    };
  };
});