define(function (require) {
  return function FetchStrategyForSegmentedSearch(Private, Promise, Notifier, timefilter, es, configFile) {
    var _ = require('lodash');
    var searchStrategy = Private(require('components/courier/fetch/strategy/search'));
    var SegmentedState = Private(require('components/courier/fetch/segmented_state'));
    var pendingRequests = Private(require('components/courier/_pending_requests'));

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
        if (!(req.segmented instanceof SegmentedState)) {
          this._setupRequest(req);
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

      getIncompleteRequests: function (pendingRequests) {
        var self = this;
        return self._filterPending(pendingRequests, function (req) {
          return self._validSearch(req) && self._qualifyIncomplete(req);
        });
      },

      /**
       * Resolve a single request using a single response from an msearch
       * @param  {object} req - The request object, with a defer and source property
       * @param  {object} resp - An object from the mget response's "docs" array
       * @return {Promise} - the promise created by responding to the request
       */
      resolveRequest: function (req, resp) {
        if (req.next) {
          req.next.ready = true;
        }

        return searchStrategy.resolveRequest(req, resp);
      },

      _qualifyPending: function (req) {
        return req.segmented === true;
      },

      _qualifyIncomplete: function (req) {
        return (req.segmented instanceof SegmentedState) && req.ready;
      },

      _setupRequest: function (req) {
        req.segmented = new SegmentedState(req.source, req.init);

        // generate upcomming requests and push into pending requests
        _.range(req.segmented.all.length - 1).reduce(function (prev) {
          var next = prev.next = req.source._createRequest(prev.defer);

          next.strategy = prev.strategy;
          next.segmented = req.segmented;
          next.ready = false;

          pendingRequests.push(next);
          return next;
        }, req);
      }

    });
  };
});