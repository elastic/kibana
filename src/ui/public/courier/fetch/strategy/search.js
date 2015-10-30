define(function (require) {
  return function FetchStrategyForSearch(Private, Promise, timefilter) {
    var _ = require('lodash');
    var angular = require('angular');

    return {
      clientMethod: 'msearch',

      /**
       * Flatten a series of requests into as ES request body
       *
       * @param  {array} requests - the requests to serialize
       * @return {Promise} - a promise that is fulfilled by the request body
       */
      reqsFetchParamsToBody: function (reqsFetchParams) {
        return Promise.map(reqsFetchParams, function (fetchParams) {
          return Promise.resolve(fetchParams.index)
          .then(function (indexList) {
            if (!_.isFunction(_.get(indexList, 'toIndexList'))) {
              return indexList;
            }

            var timeBounds = timefilter.getBounds();
            return indexList.toIndexList(timeBounds.min, timeBounds.max);
          })
          .then(function (indexList) {
            return angular.toJson({
              index: indexList,
              type: fetchParams.type,
              search_type: fetchParams.search_type,
              ignore_unavailable: true
            })
            + '\n'
            + angular.toJson(fetchParams.body || {});
          });
        })
        .then(function (requests) {
          return requests.join('\n') + '\n';
        });
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
