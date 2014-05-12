define(function (require) {
  return function FetchStrategyForSearch(Private, Promise, Notifier) {
    var _ = require('lodash');
    var mapper = Private(require('../../index_patterns/_mapper'));
    var fieldTypes = Private(require('field_types/field_types'));
    var notify = new Notifier();
    return {
      clientMethod: 'msearch',

      /**
       * Flatten a series of requests into as ES request body
       * @param  {array} requests - the requests to serialize
       * @return {string} - the request body
       */
      requestStatesToBody: function (states) {
        return states.map(function (state) {
          return JSON.stringify({
              index: state.index,
              type: state.type
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
        return Promise.resolve()
        .then(function () {
          var id = req.source.get('index');
          return mapper.getFieldsForIndexPattern(id);
        })
        .then(function (fields) {
          var complete = notify.event('type cast response fields');
          var error;

          try {
            // itterate each hit to transform it's values into proper fieldTypes
            resp.hits.hits.forEach(function (hit) {
              var src = hit._source = _.flattenWith('.', hit._source);
              fields.forEach(function (field) {
                var val = src[field.name];
                if (val == null) return;

                var FieldType = fieldTypes[field.type];

                src[field.name] = (Array.isArray(val))
                  ? val.map(function (v) { return new FieldType(v); })
                  : new FieldType(val);
              });
            });
          } catch (e) {
            error = e;
          } finally {
            complete(error || true);
          }

          return resp;
        })
        .then(function (convertedResp) {
          req.defer.resolve(convertedResp);
        });
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