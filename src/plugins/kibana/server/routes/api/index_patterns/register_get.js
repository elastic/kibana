const _ = require('lodash');
const Promise = require('bluebird');
const getMappings = require('../../../lib/get_mappings');
const stitchPatternAndMappings = require('../../../lib/stitch_pattern_and_mappings');
const removeDeprecatedFieldProps = require('../../../lib/remove_deprecated_field_props');
const handleESError = require('../../../lib/handle_es_error');
const createApiDocument = require('../../../lib/api_document_builders/create_api_document');
const createRelationshipObject = require('../../../lib/api_document_builders/create_relationship_object');
const createResourceObject = require('../../../lib/api_document_builders/create_resource_object');

module.exports = function registerGet(server) {

  function convertToSnakeCase(object) {
    return _.mapKeys(object, (value, key) => {
      return _.snakeCase(key);
    });
  }

  server.route({
    path: '/api/kibana/index_patterns',
    method: 'GET',
    handler: function (req, reply) {
      const boundCallWithRequest = _.partial(server.plugins.elasticsearch.callWithRequest, req);
      const shouldIncludeTemplate = req.query.include === 'template';

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

          let relationshipsObject;
          if (patternHit._source.template_id) {
            relationshipsObject = {
              template: createRelationshipObject('index_templates', patternHit._source.template_id)
            };
            delete patternHit._source.template_id;
          }
          const snakeAttributes = convertToSnakeCase(patternHit._source);
          return createResourceObject('index_patterns', patternHit._id, snakeAttributes, relationshipsObject);
        });
      })
      .then((patterns) => {
        if (!shouldIncludeTemplate) {
          return createApiDocument(patterns);
        }

        const templateIdSet = new Set();
        patterns.forEach(pattern => {
          const templateId = _.get(pattern, 'relationships.template.data.id');
          if (templateId) {
            templateIdSet.add(templateId);
          }
        });

        return Promise.map(Array.from(templateIdSet), (templateId) => {
          return boundCallWithRequest('indices.getTemplate', {name: templateId})
          .then((template) => {
            return createResourceObject('index_templates', templateId, template[templateId]);
          });
        })
        .then((templates) => {
          return createApiDocument(patterns, templates);
        });
      })
      .then(
        function (patterns) {
          reply(patterns);
        },
        function (error) {
          reply(handleESError(error));
        }
      );
    }
  });

  server.route({
    path: '/api/kibana/index_patterns/{id}',
    method: 'GET',
    handler: function (req, reply) {
      const boundCallWithRequest = _.partial(server.plugins.elasticsearch.callWithRequest, req);
      let pattern = req.params.id;

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
          reply(pattern);
        },
        function (error) {
          reply(handleESError(error));
        }
      );
    }
  });
};
