import { fromExpression, toExpression } from '../../common/lib/ast';

export function translate(server) {
  console.log('HELLLLLOOOOOOO!!!!!!!!')
  /*
    Get AST from expression
  */
  server.route({
    method: 'GET',
    path: '/api/canvas/ast',
    handler: function (request, reply) {
      console.log('word');
      if (!request.query.expression) return reply({ error: '"expression" query is required' }).code(400);
      reply(fromExpression(request.query.expression));
    }
  });

  /*
  app.get('/api/ast', function response(req, res) {
    if (!req.query.expression) return res.end('"expression" query is required').status(400);
    res.json(fromExpression(req.query.expression));
  });


  app.post('/api/expression', function response(req, res) {
    try {
      const exp = toExpression(req.body);
      res.end(exp);
    } catch (e) {
      res.status(400).send(e.message);
    }
  });
  */

}
