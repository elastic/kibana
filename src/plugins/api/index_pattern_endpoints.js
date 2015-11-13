const esErrors = require('elasticsearch').errors;
const Boom = require('Boom');
const _ = require('lodash');
const Promise = require('bluebird');
const getMappings = require('./lib/get_mappings');
const stitchPatternAndMappings = require('./lib/stitch_pattern_and_mappings');

export default function (server) {

  let handleESError = function (error) {
    if (error instanceof esErrors.ConnectionFault ||
      error instanceof esErrors.ServiceUnavailable ||
      error instanceof esErrors.NoConnections ||
      error instanceof esErrors.RequestTimeout) {
      return Boom.serverTimeout();
    } else if (error instanceof esErrors.Conflict) {
      return Boom.conflict();
    } else if (error instanceof esErrors[403]) {
      return Boom.forbidden();
    } else if (error instanceof esErrors.NotFound) {
      return Boom.notFound();
    } else if (error instanceof esErrors.BadRequest || error instanceof TypeError) {
      return Boom.badRequest(error);
    } else {
      return error;
    }
  };

  server.route({
    path: '/api/index-patterns',
    method: 'GET',
    handler: function (req, reply) {
      let client = server.plugins.elasticsearch.client;

      client.search({
        index: '.kibana',
        type: 'index-pattern',
        body: {
          query: {
            match_all: {}
          }
        }
      }).then(function parseResults(results) {
        const hits = results.hits.hits;
        return _.map(hits, (patternHit) => {
          patternHit._source.fields = JSON.parse(patternHit._source.fields);
          return patternHit._source;
        });
      }).then((patterns) => {
        return Promise.map(patterns, (pattern) => {
          return getMappings(pattern.title, client).catch(() => {
            return {};
          }).then((mappings) => {
            return stitchPatternAndMappings(pattern, mappings);
          });
        });
      }).then((patterns) => {
        reply(patterns);
      }, function (error) {
        reply(handleESError(error));
      });
    }
  });

  server.route({
    path: '/api/index-patterns/{id}',
    method: 'GET',
    handler: function (req, reply) {
      let client = server.plugins.elasticsearch.client;
      let pattern = req.params.id;

      Promise.join(
        client.get({
          index: '.kibana',
          type: 'index-pattern',
          id: req.params.id
        }).then((result) => {
          result._source.fields = JSON.parse(result._source.fields);
          return result._source;
        }),
        getMappings(pattern, client),
        stitchPatternAndMappings
      ).then(function (pattern) {
        reply(pattern);
      }, function (error) {
        reply(handleESError(error));
      });
    }
  });

  server.route({
    path: '/api/index-patterns',
    method: 'POST',
    handler: function (req, reply) {
      const client = server.plugins.elasticsearch.client;
      const indexPattern = _.cloneDeep(req.payload);
      const isWildcard = _.contains(indexPattern.title, '*') || (indexPattern.title.match(/\[.*]/) !== null);
      const mappings = _.omit(_.mapValues(_.indexBy(req.payload.fields, 'name'), (value) => {
        return value.mapping;
      }), _.isUndefined);
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
                name: 'kibana-' + indexPattern.title.toLowerCase(),
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
    path: '/api/index-patterns/{id}',
    method: 'PUT',
    handler: function (req, reply) {
      let client = server.plugins.elasticsearch.client;
      const indexPattern = _.cloneDeep(req.payload);
      const isWildcard = _.contains(indexPattern.title, '*') || (indexPattern.title.match(/\[.*]/) !== null);
      const mappings = _.omit(_.mapValues(_.indexBy(req.payload.fields, 'name'), (value) => {
        return value.mapping;
      }), _.isUndefined);
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
    path: '/api/index-patterns/{id}',
    method: 'DELETE',
    handler: function (req, reply) {
      let client = server.plugins.elasticsearch.client;

      client.delete({
        index: '.kibana',
        type: 'index-pattern',
        id: req.params.id
      }).then(function (pattern) {
        reply(pattern);
      }, function (error) {
        reply(handleESError(error));
      });
    }
  });
}
