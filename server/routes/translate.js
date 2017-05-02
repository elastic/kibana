import { fromExpression, toExpression } from '../../common/lib/ast';

export function translate(app) {
  /*
    Get AST from expression
  */
  app.get('/api/ast', function response(req, res) {
    if (!req.query.expression) return res.end('"expression" query is required').status(400);
    res.json(fromExpression(req.query.expression));
  });

  /*
    Get expression from AST
  */
  app.post('/api/expression', function response(req, res) {
    try {
      const exp = toExpression(req.body);
      res.end(exp);
    } catch (e) {
      res.status(400).send(e.message);
    }
  });

};
