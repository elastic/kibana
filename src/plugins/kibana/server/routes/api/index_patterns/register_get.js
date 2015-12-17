const _ = require('lodash');
const Promise = require('bluebird');
const getMappings = require('../../../lib/get_mappings');
const stitchPatternAndMappings = require('../../../lib/stitch_pattern_and_mappings');
const removeDeprecatedFieldProps = require('../../../lib/remove_deprecated_field_props');
const handleESError = require('../../../lib/handle_es_error');

module.exports = function registerGet(server, cache) {

  function convertToSnakeCase(object) {
    return _.mapKeys(object, (value, key) => {
      return _.snakeCase(key);
    });
  }

  server.route({
    path: '/api/kibana/index_patterns',
    method: 'GET',
    handler: function (req, reply) {
      cache.get('kibana-all', function (err, value) {
        if (value) {
          return reply(value);
        }

        const boundCallWithRequest = _.partial(server.plugins.elasticsearch.callWithRequest, req);

        const params = {
          index: '.kibana',
          type: 'index-pattern',
          body: {
            query: {
              match_all: {}
            }
          }
        };

        boundCallWithRequest('search', params)
          .then(function parseResults(results) {
            const hits = results.hits.hits;
            return _.map(hits, (patternHit) => {
              patternHit._source.fields = JSON.parse(patternHit._source.fields);
              return patternHit._source;
            });
          })
          .then((patterns) => {
            return Promise.map(patterns, (pattern) => {
              return getMappings(pattern.title, boundCallWithRequest).catch(() => {
                return {};
              })
                .then((mappings) => {
                  return stitchPatternAndMappings(pattern, mappings);
                });
            });
          })
          .then(removeDeprecatedFieldProps)
          .then((patterns) => {
            return _.map(patterns, convertToSnakeCase);
          })
          .then(
            function (patterns) {
              cache.set('kibana-all', patterns);
              reply(patterns);
            },
            function (error) {
              reply(handleESError(error));
            }
          );
      });
    }
  });

  server.route({
    path: '/api/kibana/index_patterns/{id}',
    method: 'GET',
    handler: function (req, reply) {
      const boundCallWithRequest = _.partial(server.plugins.elasticsearch.callWithRequest, req);
      let pattern = req.params.id;

      cache.get(pattern, function (err, value) {
        if (value) {
          return reply(value);
        }

        const params = {
          index: '.kibana',
          type: 'index-pattern',
          id: req.params.id
        };

        Promise.join(
          boundCallWithRequest('get', params)
            .then((result) => {
              result._source.fields = JSON.parse(result._source.fields);
              return result._source;
            }),
          getMappings(pattern, boundCallWithRequest),
          stitchPatternAndMappings
          )
          .then(removeDeprecatedFieldProps)
          .then(convertToSnakeCase)
          .then(
            function (pattern) {
              cache.set(req.params.id, pattern);
              reply(pattern);
            },
            function (error) {
              reply(handleESError(error));
            }
          );
      });
    }
  });
};
