const _ = require('lodash');
const Promise = require('bluebird');
const getMappings = require('../../../lib/get_mappings');
const stitchPatternAndMappings = require('../../../lib/stitch_pattern_and_mappings');
const removeDeprecatedFieldProps = require('../../../lib/remove_deprecated_field_props');
const handleESError = require('../../../lib/handle_es_error');

module.exports = function registerGet(server) {

  server.route({
    path: '/api/kibana/index_patterns',
    method: 'GET',
    handler: function (req, reply) {
      const callWithRequest = server.plugins.elasticsearch.callWithRequest;

      const params = {
        index: '.kibana',
        type: 'index-pattern',
        body: {
          query: {
            match_all: {}
          }
        }
      };

      callWithRequest(req, 'search', params)
        .then(function parseResults(results) {
          const hits = results.hits.hits;
          return _.map(hits, (patternHit) => {
            patternHit._source.fields = JSON.parse(patternHit._source.fields);
            return patternHit._source;
          });
        })
        .then((patterns) => {
          return Promise.map(patterns, (pattern) => {
            return getMappings(pattern.title, req).catch(() => {
              return {};
            }).then((mappings) => {
              return stitchPatternAndMappings(pattern, mappings);
            });
          });
        })
        .then(removeDeprecatedFieldProps)
        .then((patterns) => {
          reply(patterns);
        }, function (error) {
          reply(handleESError(error));
        });
    }
  });

  server.route({
    path: '/api/kibana/index_patterns/{id}',
    method: 'GET',
    handler: function (req, reply) {
      const callWithRequest = server.plugins.elasticsearch.callWithRequest;
      let pattern = req.params.id;

      const params = {
        index: '.kibana',
        type: 'index-pattern',
        id: req.params.id
      };

      Promise.join(
        callWithRequest(req, 'get', params)
          .then((result) => {
            result._source.fields = JSON.parse(result._source.fields);
            return result._source;
          }),
        getMappings(pattern, req),
        stitchPatternAndMappings)
        .then(removeDeprecatedFieldProps)
        .then(function (pattern) {
          reply(_.isArray(pattern) ? pattern[0] : pattern);
        }, function (error) {
          reply(handleESError(error));
        });
    }
  });
};
