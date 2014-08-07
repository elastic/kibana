define(function (require) {
  return function FetchStrategyForSearch(Private, Promise, Notifier, timefilter) {
    var _ = require('lodash');

    var notify = new Notifier();

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
      },

      /**
       * Resolve a single request using a single response from an msearch
       * @param  {object} req - The request object, with a defer and source property
       * @param  {object} resp - An object from the mget response's "docs" array
       * @return {Promise} - the promise created by responding to the request
       */
      resolveRequest: function (req, resp) {
        if (resp && resp.hits) {
          resp.hits.hits.forEach(function (hit) {
            hit._source = _.flattenWith('.', hit._source);
          });
        }
        req.defer.resolve(resp);
      },

      /**
       * Get the doc requests from the courier that are ready to be fetched
       * @param {array} pendingRequests - The list of pending requests, from
       *                                  which the requests to make should be
       *                                  removed
       * @return {array} - The filtered request list, pulled from
       *                   the courier's _pendingRequests queue
       */
      getPendingRequests: function (pendingRequests) {
        return pendingRequests.splice(0).filter(function (req) {
          // filter by type first
          if (req.source._getType() === 'search' && !req.source._fetchDisabled) return true;
          else pendingRequests.push(req);
        });
      }
    };
  };
});