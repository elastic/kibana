import { getESIndices } from './get_es_indices';

// TODO: Error handling, note: esErrors
export function esIndices(server) {
  const kbnIndex = server.config().get('kibana.index');


  server.route({
    method: 'GET',
    path: '/api/canvas/es_indices',
    handler: function (request, reply) {
      reply(getESIndices(kbnIndex));
    },
  });
}
