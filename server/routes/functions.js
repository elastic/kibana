import { functions as functionsRegistry } from '../lib/functions';

export function functions(server) {
  /*
    Get AST from expression
  */
  server.route({
    method: 'GET',
    path: '/api/canvas/functions',
    handler: function (request, reply) {
      const { type } = request.query;
      reply(functionsRegistry.toArray().filter(fn => !type || (type && fn.type === type)));
    },
  });
}
