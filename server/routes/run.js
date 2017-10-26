import { functionsRegistry } from '../../common/lib/functions_registry';
import { interpretProvider } from '../../common/interpreter/interpret';
import { typesRegistry } from '../../common/lib/types_registry';
import { createHandlers } from '../lib/create_handlers';
import { fromExpression } from '../../common/lib/ast';


export function runApi(server) {
  const handleRequest = (request, reply, expression, context) => {
    const interpret = interpretProvider({
      types: typesRegistry.toJS(),
      functions: functionsRegistry.toJS(),
      handlers: createHandlers(request, server),
      onFunctionNotFound: () => {},
    });

    try {
      interpret(fromExpression(expression), context)
      .then(resp => {
        reply(resp);
      });
    } catch (e) {
      reply({ error: e.message }).code(500);
    }
  };

  server.route({
    method: 'GET',
    path: '/api/canvas/run',
    handler: function (request, reply) {
      if (!request.query.expression) return reply({ error: '"expression" query is required' }).code(400);
      handleRequest(request, reply, request.query.expression, null);
    },
  });

  server.route({
    method: 'POST',
    path: '/api/canvas/run',
    handler: function (request, reply) {
      console.log(request.payload);
      const { expression, context } = request.payload;
      if (!expression) return reply({ error: '"expression" key is required' }).code(400);
      handleRequest(request, reply, expression, typeof context === 'undefined' ? null : context);
    },
  });
}
