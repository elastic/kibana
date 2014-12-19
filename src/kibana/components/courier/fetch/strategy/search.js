define(function (require) {
  return function FetchStrategyForSearch(Private, Promise, timefilter) {
    var _ = require('lodash');

    return {
      clientMethod: 'msearch',

      getSourceStateFromRequest: function (req) {
        return req.source._flatten();
      },

      /**
       * Flatten a series of requests into as ES request body
       * @param  {array} requests - the requests to serialize
       * @return {string} - the request body
       */
      convertStatesToBody: function (states) {
        return states.map(function (state) {
          var timeBounds = timefilter.getBounds();
          var indexList = state.index.toIndexList(timeBounds.min, timeBounds.max);

          return JSON.stringify({
              index: indexList,
              type: state.type,
              ignore_unavailable: true
            })
            + '\n'
            + JSON.stringify(state.body);

        }).join('\n') + '\n';
      },

      /**
       * Fetch the multiple responses from the ES Response
       * @param  {object} resp - The response sent from Elasticsearch
       * @return {array} - the list of responses
       */
      getResponses: function (resp) {
        return resp.responses;
      }
    };
  };
});