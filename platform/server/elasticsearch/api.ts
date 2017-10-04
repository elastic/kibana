import { Router } from '../http';
import { object, string, maybe } from '../../lib/schema';
import { ElasticsearchRequestHelpers } from './ElasticsearchFacade';
import { LoggerFactory } from '../../logging';

export function registerElasticsearchRoutes(
  router: Router<ElasticsearchRequestHelpers>,
  logger: LoggerFactory
) {
  const log = logger.get('elasticsearch', 'routes');

  log.info('creating elasticsearch api');

  router.get(
    {
      path: '/:field',
      validate: {
        params: object({
          field: string()
        }),
        query: object({
          key: maybe(string())
        })
      }
    },
    async (elasticsearch, req, res) => {
      // WOHO! Both of these are typed!
      log.info(`field param: ${req.params.field}`);
      log.info(`query param: ${req.query.key}`);

      log.info('request received on [data] cluster');

      const cluster = await elasticsearch.getClusterOfType('data');

      log.info('got [data] cluster, now calling it');

      const response = await cluster.withRequest(req, (client, headers) =>
        client.search({})
      );

      return res.ok({
        params: req.params,
        query: req.query,
        total_count: response.hits.total
      });
    }
  );

  return router;
}
