define(function (require) {
  return function FetchStrategyForSegmentedSearch(Private, Promise, Notifier, timefilter, es, configFile) {
    var _ = require('lodash');
    var searchStrategy = Private(require('components/courier/fetch/strategy/search'));
    var SegmentedState = Private(require('components/courier/fetch/segmented_state'));

    // extend the client to behave well for this strategy
    es.segmentSafeMsearch = function (params) {
      return es.msearch(params)
      .catch(function (err) {
        // swallow errors from closed indices
        if (err.status === 403 && err.message.match(/ClusterBlockException.+index closed/)) {
          return false;
        } else {
          throw err;
        }
      });
    };

    // extend the searchStrategy with simple pojo merging
    return _.assign({}, searchStrategy, {
      clientMethod: 'segmentSafeMsearch',

      getSourceStateFromRequest: function (req) {
        if (!(req.segmented instanceof SegmentedState)) {
          // first request, setup the SegmentedState
          req.segmented = new SegmentedState(req.source, req.init);
        }

        return req.segmented.getSourceStateFromRequest(req);
      },

      /**
       * Flatten a series of requests into as ES request body
       * @param  {array} requests - the requests to serialize
       * @return {string} - the request body
       */
      convertStatesToBody: function (states) {
        return states.map(function (state) {
          return JSON.stringify({
              index: state.index,
              type: state.type,
              ignore_unavailable: true,
              timeout: configFile.shard_timeout
            })
            + '\n'
            + JSON.stringify(state.body);

        }).join('\n') + '\n';
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

      getIncompleteRequests: function (pendingRequests) {
        var self = this;
        return self._filterPending(pendingRequests, function (req) {
          return self._validSearch(req) && self._qualifyIncomplete(req);
        });
      },

      _qualifyPending: function (req) {
        return req.segmented === true;
      },

      _qualifyIncomplete: function (req) {
        return req.segmented instanceof SegmentedState;
      }

    });
  };
});