import { fromExpression, toExpression } from '../../common/lib/ast';

export function translate(server) {
  /*
    Get AST from expression
  */
  server.route({
    method: 'GET',
    path: '/api/canvas/ast',
    handler: function(request, reply) {
      if (!request.query.expression)
        return reply({ error: '"expression" query is required' }).code(400);
      reply(fromExpression(request.query.expression));
    },
  });

  server.route({
    method: 'POST',
    path: '/api/canvas/expression',
    handler: function(request, reply) {
      try {
        const exp = toExpression(request.payload);
        reply(exp);
      } catch (e) {
        reply({ error: e.message }).code(400);
      }
    },
  });
}
