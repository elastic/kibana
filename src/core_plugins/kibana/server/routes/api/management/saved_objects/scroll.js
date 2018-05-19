import Boom from 'boom';
import Joi from 'joi';
import _ from 'lodash';
// import { findRelationships } from '../../../../lib/management/saved_objects/relationships';

async function fetchUntilDone(callCluster, response, results) {
  results.push(...response.hits.hits);
  if (response.hits.total > results.length) {
    const nextResponse = await callCluster('scroll', {
      scrollId: response._scroll_id,
      scroll: '30s',
    });
    await fetchUntilDone(callCluster, nextResponse, results);
  }
}

export function registerScrollForExportRoute(server) {
  server.route({
    path: '/api/kibana/management/saved_objects/scroll/export',
    method: ['POST'],
    config: {
      validate: {
        payload: Joi.object().keys({
          typesToInclude: Joi.array().items(Joi.string()).required(),
        }).required(),
      },
    },

    handler: async (req, reply) => {
      const { callWithRequest } = server.plugins.elasticsearch.getCluster('admin');
      const callCluster = _.partial(callWithRequest, req);
      const results = [];
      const body = {
        query: {
          bool: {
            should: req.payload.typesToInclude.map(type => ({
              term: {
                type: {
                  value: type,
                }
              }
            })),
          }
        }
      };

      try {
        await fetchUntilDone(callCluster, await callCluster('search', {
          index: server.config().get('kibana.index'),
          scroll: '30s',
          body,
        }), results);

        const response = results.map(hit => {
          const type = hit._source.type;
          if (hit._type === 'doc') {
            return {
              _id: hit._id.replace(`${type}:`, ''),
              _type: type,
              _source: hit._source[type],
              _meta: {
                savedObjectVersion: 2
              }
            };
          }
          return {
            _id: hit._id,
            _type: hit._type,
            _source: hit._source,
          };
        });

        reply(response);
      }
      catch (err) {
        reply(Boom.boomify(err, { statusCode: 500 }));
      }
    }
  });
}

export function registerScrollForCountRoute(server) {
  server.route({
    path: '/api/kibana/management/saved_objects/scroll/counts',
    method: ['POST'],
    config: {
      validate: {
        payload: Joi.object().keys({
          typesToInclude: Joi.array().items(Joi.string()).required(),
          searchString: Joi.string()
        }).required(),
      },
    },

    handler: async (req, reply) => {
      const { callWithRequest } = server.plugins.elasticsearch.getCluster('admin');
      const callCluster = _.partial(callWithRequest, req);
      const results = [];

      const body = {
        _source: 'type',
        query: {
          bool: {
            should: req.payload.typesToInclude.map(type => ({
              term: {
                type: {
                  value: type,
                }
              }
            })),
          }
        }
      };

      if (req.payload.searchString) {
        body.query.bool.must = {
          simple_query_string: {
            query: `${req.payload.searchString}*`,
            fields: req.payload.typesToInclude.map(type => `${type}.title`),
          }
        };
      }

      try {
        await fetchUntilDone(callCluster, await callCluster('search', {
          index: server.config().get('kibana.index'),
          scroll: '30s',
          body,
        }), results);

        const counts = results.reduce((accum, result) => {
          const type = result._source.type;
          accum[type] = accum[type] || 0;
          accum[type]++;
          return accum;
        }, {});

        for (const type of req.payload.typesToInclude) {
          if (!counts[type]) {
            counts[type] = 0;
          }
        }

        reply(counts);
      }
      catch (err) {
        reply(Boom.boomify(err, { statusCode: 500 }));
      }
    }
  });
}
