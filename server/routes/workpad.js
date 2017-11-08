import boom from 'boom';
import { CANVAS_TYPE, API_ROUTE_WORKPAD } from '../../common/lib/constants';
import { getId } from '../../public/lib/get_id.js';

export function workpad(server) {
  const config = server.config();
  const { callWithRequest, errors:esErrors } = server.plugins.elasticsearch.getCluster('data');
  const routePrefix = API_ROUTE_WORKPAD;
  const indexName = config.get('kibana.index');

  function formatResponse(reply, returnResponse = false) {
    return (resp) => {
      if (resp instanceof esErrors['400']) return reply(boom.badRequest(resp));
      if (resp instanceof esErrors['401']) return reply(boom.unauthorized());
      if (resp instanceof esErrors['403']) return reply(boom.forbidden('Sorry, you don\'t have access to that'));
      if (resp instanceof esErrors['404']) return reply(boom.wrap(resp, 404));
      return returnResponse ? resp : reply(resp);
    };
  }

  function createWorkpad(request, id) {
    const now = (new Date()).toISOString();
    const doc = {
      refresh: 'wait_for',
      index: indexName,
      type: 'doc',
      id: id || request.payload.id || getId('workpad'),
      body: {
        type: CANVAS_TYPE,
        [CANVAS_TYPE]: {
          ...request.payload,
          '@timestamp': now,
          '@created': now,
        },
      },
    };

    return callWithRequest(request, 'create', doc);
  }

  function updateWorkpad(request) {
    const workpadId = request.params.id;
    const findDoc = {
      index: indexName,
      type: 'doc',
      id: workpadId,
    };

    return callWithRequest(request, 'get', findDoc)
    .then(({ _source }) => {
      const body = {
        type: CANVAS_TYPE,
        [CANVAS_TYPE]: {
          ...request.payload,
          '@created': _source['@created'] || (new Date()).toISOString(),
          '@timestamp': (new Date()).toISOString(),
        },
      };

      // const srcElements = get(_source, '')
      const doc = {
        refresh: 'wait_for',
        index: indexName,
        type: 'doc',
        id: workpadId,
        body: body,
      };

      return callWithRequest(request, 'index', doc);
    })
    .catch((err) => {
      if (err instanceof esErrors['404']) {
        return createWorkpad(request, workpadId);
      }

      throw err;
    });
  }

  // get workpad
  server.route({
    method: 'GET',
    path: `${routePrefix}/{id}`,
    handler: function (request, reply) {
      const doc = {
        index: indexName,
        type: 'doc',
        id: request.params.id,
      };

      callWithRequest(request, 'get', doc)
      .then(formatResponse(reply, true))
      .then(resp => reply(resp._source[CANVAS_TYPE]))
      .catch(formatResponse(reply));
    },
  });

  // create workpad
  server.route({
    method: 'POST',
    path: routePrefix,
    config: { payload: { maxBytes: 26214400 } }, // 25MB payload limit
    handler: function (request, reply) {
      createWorkpad(request)
      .then(formatResponse(reply))
      .catch(formatResponse(reply));
    },
  });

  // update workpad
  server.route({
    method: 'PUT',
    path: `${routePrefix}/{id}`,
    config: { payload: { maxBytes: 26214400 } }, // 25MB payload limit
    handler: function (request, reply) {
      updateWorkpad(request)
      .then(formatResponse(reply))
      .catch(formatResponse(reply));
    },
  });

  // delete workpad
  server.route({
    method: 'DELETE',
    path: `${routePrefix}/{id}`,
    handler: function (request, reply) {
      const doc = {
        index: indexName,
        type: 'doc',
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
      const { name, page } = request.query;
      const limit = Number(request.query.limit) || 10000;
      const offset = (page && page >= 1) ? (page - 1) * limit : 0;

      const getQuery = (name) => {
        const nameField = `${CANVAS_TYPE}.name`;
        const nameFieldKeyword = `${nameField}.keyword`;

        if (name != null) {
          return { bool: { should: [
            { match: { type: CANVAS_TYPE } },
            { match: { [nameField]: name } },
            { wildcard: { [nameField]: `*${name}` } },
            { wildcard: { [nameField]: `${name}*` } },
            { wildcard: { [nameField]: `*${name}*` } },
            { match: { [nameFieldKeyword]: name } },
            { wildcard: { [nameFieldKeyword]: `*${name}` } },
            { wildcard: { [nameFieldKeyword]: `${name}*` } },
            { wildcard: { [nameFieldKeyword]: `*${name}*` } },
          ] } };
        }

        return { match_all: {} };
      };

      const doc = {
        index: indexName,
        type: 'doc',
        body: {
          query: getQuery(name),
          _source: ['name', 'id', '@timestamp', '@created'].map(name => `${CANVAS_TYPE}.${name}`),
          sort: [{ [`${CANVAS_TYPE}.@timestamp`]: { order: 'desc' } }],
          // TODO: Don't you hate this? Kibana did this, drives people nuts. Welcome to nut town. Nutball.
          size: limit,
          from: offset,
        },
      };

      callWithRequest(request, 'search', doc)
      .then(formatResponse(reply, true))
      .then((resp) => {
        reply({
          total: resp.hits.total,
          workpads: resp.hits.hits.map(hit => hit._source[CANVAS_TYPE]),
        });
      })
      .catch(formatResponse(reply));
    },
  });
}
