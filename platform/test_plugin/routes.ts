import { Router } from '../server/http';
import { LoggerFactory } from '../logging';
import { object, string, maybe } from '../lib/schema';

export function registerTestRoutes(
  router: Router<any>,
  logger: LoggerFactory,
) {
  const log = logger.get('test', 'routes');
  log.info('creating test routes');

  router.get({
    path: '/:field',
    validate: {
      params: object({
        field: string(),
      }),
      query: object({
        key: maybe(string()),
      }),
    }
  }, async (_, req, res) => {
    log.info('test GET request received');

    log.info(`first argument: ${JSON.stringify(_)}`);
    log.info(`field param: ${req.params.field}`);
    log.info(`key query param: ${req.query.key}`);

    log.info('');

    return res.ok({
      params: req.params,
      query: req.query,
    });
  });

  router.post({
    path: '/',
    validate: {
      body: object({
        field: string(),
      })
    }
  }, async (_, req, res) => {
    log.info(`test POST request received`);

    log.info(`first argument: ${JSON.stringify(_)}`);
    log.info(`body: ${JSON.stringify(req.body)}`);

    log.info('');

    return res.ok(req.body);
  });

  router.put({
    path: '/',
    validate: {
      body: object({
        field: string()
      })
    }
  }, async (_, req, res) => {
    log.info(`test PUT request received`);

    log.info(`first argument: ${JSON.stringify(_)}`);
    log.info(`body: ${JSON.stringify(req.body)}`);

    log.info('');

    return res.ok(req.body);
  });

  router.delete({
    path: '/:field',
    validate: {
      params: object({
        field: string()
      })
    }
  }, async (_, req, res) => {
    log.info(`test DELETE request received`);

    log.info(`first argument: ${JSON.stringify(_)}`);
    log.info(`field param: ${req.params.field}`);

    log.info('');

    return res.ok(req.params);
  });

  return router;
}
