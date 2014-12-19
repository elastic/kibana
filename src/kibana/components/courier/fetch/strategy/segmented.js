define(function (require) {
  return function FetchStrategyForSegmentedSearch(Private, Promise, Notifier, timefilter, es, configFile) {
    var _ = require('lodash');
    var searchStrategy = Private(require('components/courier/fetch/strategy/search'));

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
    return _.assign(Object.create(searchStrategy), {
      clientMethod: 'segmentSafeMsearch',

      getSourceStateFromRequest: function (req) {
        return req.segState.getSourceStateFromRequest(req);
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
      }
    });
  };
});