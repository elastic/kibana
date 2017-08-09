import boom from 'boom';
import uuid from 'uuid/v4';
import { merge } from 'lodash';
import { INDEX_WORKPAD_SUFFIX, CANVAS_TYPE } from '../../common/lib/constants';

export function workpad(server) {
  const config = server.config();
  const { callWithRequest, errors:esErrors } = server.plugins.elasticsearch.getCluster('data');
  const routePrefix = '/api/canvas/workpad';
  const indexName = `${config.get('canvas.indexPrefix')}${INDEX_WORKPAD_SUFFIX}`;

  function formatResponse(reply) {
    return (resp) => {
      if (resp instanceof esErrors['400']) return reply(boom.badRequest(resp));
      if (resp instanceof esErrors['401']) return reply(boom.unauthorized());
      if (resp instanceof esErrors['403']) return reply(boom.forbidden('Sorry, you don\'t have access to that'));
      if (resp instanceof esErrors['404']) return reply(boom.wrap(resp, 404));
      return reply(resp);
    };
  }

  // get workpad
  server.route({
    method: 'GET',
    path: `${routePrefix}/{id}`,
    handler: function (request, reply) {
      const doc = {
        index: indexName,
        type: CANVAS_TYPE,
        id: request.params.id,
      };

      callWithRequest(request, 'get', doc)
      .then(formatResponse(reply))
      .catch(formatResponse(reply));
    },
  });

  // create workpad
  server.route({
    method: 'POST',
    path: routePrefix,
    handler: function (request, reply) {
      const now = new Date();
      const doc = {
        index: indexName,
        type: CANVAS_TYPE,
        id: `workpad-${uuid()}`,
        body: { ...request.payload, '@timestamp': now, '@created': now },
      };

      callWithRequest(request, 'create', doc)
      .then(formatResponse(reply))
      .catch(formatResponse(reply));
    },
  });

  // update workpad
  server.route({
    method: 'PUT',
    path: `${routePrefix}/{id}`,
    handler: function (request, reply) {
      const findDoc = {
        index: indexName,
        type: CANVAS_TYPE,
        id: request.params.id,
      };

      callWithRequest(request, 'get', findDoc)
      .then(({ _source }) => {
        const doc = {
          index: indexName,
          type: CANVAS_TYPE,
          id: request.params.id,
          body: merge(_source, { ...request.payload, '@timestamp': new Date() }),
        };

        callWithRequest(request, 'index', doc)
        .then(formatResponse(reply))
        .catch(formatResponse(reply));
      });
    },
  });

  // delete workpad
  server.route({
    method: 'DELETE',
    path: `${routePrefix}/{id}`,
    handler: function (request, reply) {
      const doc = {
        index: indexName,
        type: CANVAS_TYPE,
        id: request.params.id,
      };

      callWithRequest(request, 'delete', doc)
      .then(formatResponse(reply))
      .catch(formatResponse(reply));
    },
  });

  // find workpads
  server.route({
    method: 'GET',
    path: `${routePrefix}/find`,
    handler: function (request, reply) {
      const { name } = request.query;

      const getQuery = (name) => {
        if (name != null) {
          return { bool: { should: [
            { match: { 'name': name } },
            { wildcard: { 'name': `*${name}` } },
            { wildcard: { 'name': `${name}*` } },
            { wildcard: { 'name': `*${name}*` } },
            { match: { 'name.keyword': name } },
            { wildcard: { 'name.keyword': `*${name}` } },
            { wildcard: { 'name.keyword': `${name}*` } },
            { wildcard: { 'name.keyword': `*${name}*` } },
          ] } };
        }

        return { match_all: {} };
      };

      const doc = {
        index: indexName,
        type: CANVAS_TYPE,
        body: {
          query: getQuery(name),
          _source: ['name', 'id', '@timestamp', '@created'],
          sort: [{ '@timestamp': { order: 'desc' } }],
          // TODO: Don't you hate this? Kibana did this, drives people nuts. Welcome to nut town. Nutball.
          size: 10000,
        },
      };

      callWithRequest(request, 'search', doc)
      .then(formatResponse(reply))
      .catch(formatResponse(reply));
    },
  });
}
