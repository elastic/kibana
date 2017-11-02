import { getESIndices } from './get_es_indices';
import { partial } from 'lodash';

// TODO: Error handling, note: esErrors
export function esIndices(server) {
  const kbnIndex = server.config().get('kibana.index');
  const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');

  server.route({
    method: 'GET',
    path: '/api/canvas/es_indices',
    handler: function (request, reply) {
      reply(getESIndices(kbnIndex, partial(callWithRequest, request)));
    },
  });
}
