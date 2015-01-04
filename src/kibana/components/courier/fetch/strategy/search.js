define(function (require) {
  return function FetchStrategyForSearch(Private, Promise, timefilter, configFile) {
    var _ = require('lodash');

    return {
      clientMethod: 'msearch',

      /**
       * Flatten a series of requests into as ES request body
       *
       * @param  {array} requests - the requests to serialize
       * @return {string} - the request body
       */
      reqsFetchParamsToBody: function (reqsFetchParams) {
        return reqsFetchParams.map(function (fetchParams) {
          var indexList = fetchParams.index;

          if (_.isFunction(_.deepGet(indexList, 'toIndexList'))) {
            var timeBounds = timefilter.getBounds();
            indexList = indexList.toIndexList(timeBounds.min, timeBounds.max);
          }

          return JSON.stringify({
            index: indexList,
            type: fetchParams.type,
            ignore_unavailable: true
          })
          + '\n'
          + JSON.stringify(fetchParams.body || {});
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