define(function (require) {
  return function FetchStrategyForSearch(Private, Promise, timefilter) {
    let _ = require('lodash');
    let angular = require('angular');
    let toJson = require('ui/utils/aggressive_parse').toJson;

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

            let timeBounds = timefilter.getBounds();
            return indexList.toIndexList(timeBounds.min, timeBounds.max);
          })
          .then(function (indexList) {
            // If we've reached this point and there are no indexes in the
            // index list at all, it means that we shouldn't expect any indexes
            // to contain the documents we're looking for, so we instead
            // perform a request for an index pattern that we know will always
            // return an empty result (ie. -*). If instead we had gone ahead
            // with an msearch without any index patterns, elasticsearch would
            // handle that request by querying *all* indexes, which is the
            // opposite of what we want in this case.
            if (_.isArray(indexList) && indexList.length === 0) {
              indexList.push('.kibana-devnull');
            }
            return angular.toJson({
              index: indexList,
              type: fetchParams.type,
              search_type: fetchParams.search_type,
              ignore_unavailable: true
            })
            + '\n'
            + toJson(fetchParams.body || {}, angular.toJson);
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
