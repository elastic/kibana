const esErrors = require('elasticsearch').errors;
const Boom = require('Boom');
const Joi = require('Joi');
const _ = require('lodash');
const Promise = require('bluebird');
const getMappings = require('../../lib/get_mappings');
const stitchPatternAndMappings = require('../../lib/stitch_pattern_and_mappings');
const {templateToPattern, patternToTemplate} = require('../../lib/convert_pattern_and_template_name');
const removeDeprecatedFieldProps = require('../../lib/remove_deprecated_field_props');
const indexPatternSchema = require('../../lib/schemas/index_pattern_schema');

export default function (server) {

  let handleESError = function (error) {
    if (error instanceof esErrors.ConnectionFault ||
      error instanceof esErrors.ServiceUnavailable ||
      error instanceof esErrors.NoConnections ||
      error instanceof esErrors.RequestTimeout) {
      return Boom.serverTimeout(error);
    } else if (error instanceof esErrors.Conflict || _.contains(error.message, 'index_template_already_exists')) {
      return Boom.conflict(error);
    } else if (error instanceof esErrors[403]) {
      return Boom.forbidden(error);
    } else if (error instanceof esErrors.NotFound) {
      return Boom.notFound(error);
    } else if (error instanceof esErrors.BadRequest || error instanceof TypeError) {
      return Boom.badRequest(error);
    } else {
      return error;
    }
  };

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

  server.route({
    path: '/api/kibana/index_patterns',
    method: 'POST',
    handler: function (req, reply) {
      if (_.isEmpty(req.payload)) { return reply(Boom.badRequest('Payload required')); }
      const validation = Joi.validate(req.payload, indexPatternSchema.post);
      if (validation.error) {
        return reply(Boom.badRequest(validation.error));
      }

      const client = server.plugins.elasticsearch.client;
      const indexPattern = _.cloneDeep(req.payload);
      const isWildcard = _.contains(indexPattern.title, '*');
      const mappings = _(req.payload.fields)
        .indexBy('name')
        .mapValues(value => value.mapping)
        .omit(_.isUndefined)
        .value();
      indexPattern.fields = JSON.stringify(_.map(indexPattern.fields, (field) => {
        return _.omit(field, 'mapping');
      }));


      client.create({
        index: '.kibana',
        type: 'index-pattern',
        id: indexPattern.title,
        body: indexPattern
      }).then((patternResponse) => {
        if (!isWildcard || _.isEmpty(mappings)) {
          return patternResponse;
        }
        else {
          return client.indices.exists({
            index: indexPattern.title
          }).then((matchingIndices) => {
            if (matchingIndices) {
              throw Boom.conflict('Cannot create an index template if existing indices already match index pattern');
            }
            else {
              return client.indices.putTemplate({
                order: 0,
                create: true,
                name: patternToTemplate(indexPattern.title),
                body: {
                  template: indexPattern.title,
                  mappings: {
                    _default_: {
                      properties: mappings
                    }
                  }
                }
              });
            }
          }).catch((templateError) => {
            return client.delete({
              index: '.kibana',
              type: 'index-pattern',
              id: indexPattern.title
            }).then(() => {
              throw templateError;
            }, () => {
              throw new Error(`index-pattern ${indexPattern.title} created successfully but index template creation
                failed. Failed to rollback index-pattern creation, must delete manually.`);
            });
          });
        }
      }).then(() => {
        reply('success').statusCode = 201;
      }).catch(function (error) {
        reply(handleESError(error));
      });
    }
  });

  server.route({
    path: '/api/kibana/index_patterns/{id}',
    method: 'PUT',
    handler: function (req, reply) {
      if (_.isEmpty(req.payload)) { return reply(Boom.badRequest('Payload required')); }
      if (req.payload.title !== req.params.id) { return reply(Boom.badRequest('Updates to title not supported')); }
      const validation = Joi.validate(req.payload, indexPatternSchema.put);
      if (validation.error) {
        return reply(Boom.badRequest(validation.error));
      }

      let client = server.plugins.elasticsearch.client;
      const indexPattern = _.cloneDeep(req.payload);
      const mappings = _(req.payload.fields)
        .indexBy('name')
        .mapValues(value => value.mapping)
        .omit(_.isUndefined)
        .value();
      indexPattern.fields = JSON.stringify(_.map(indexPattern.fields, (field) => {
        return _.omit(field, 'mapping');
      }));

      if (!_.isEmpty(mappings)) {
        reply(Boom.badRequest('Mappings cannot be updated'));
      } else {
        client.update({
          index: '.kibana',
          type: 'index-pattern',
          id: req.params.id,
          body: {
            doc: indexPattern
          }
        }).then(function (pattern) {
          reply(pattern);
        }, function (error) {
          reply(handleESError(error));
        });
      }
    }
  });

  server.route({
    path: '/api/kibana/index_patterns/{id}',
    method: 'DELETE',
    handler: function (req, reply) {
      let client = server.plugins.elasticsearch.client;

      Promise.all([
        client.delete({
          index: '.kibana',
          type: 'index-pattern',
          id: req.params.id
        }),
        client.indices.deleteTemplate({
          name: patternToTemplate(req.params.id)
        }).catch((error) => {
          if (!error.status || error.status !== 404) {
            throw error;
          }
        })
      ]).then(function (pattern) {
        reply('success');
      }, function (error) {
        reply(handleESError(error));
      });
    }
  });
}
