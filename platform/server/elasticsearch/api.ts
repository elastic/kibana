import { Router } from '../http';
import { object, string, maybe } from '../../lib/schema';
import { ElasticsearchService } from './ElasticsearchService';
import { LoggerFactory } from '../../logging';

export function registerElasticsearchRoutes(
  router: Router,
  logger: LoggerFactory,
  service: ElasticsearchService
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
    async (req, res) => {
      // WOHO! Both of these are typed!
      log.info(`field param: ${req.params.field}`);
      log.info(`query param: ${req.query.key}`);

      log.info('request received on [data] cluster');

      const cluster = await service.getScopedDataClient(req.headers);

      log.info('got scoped [data] cluster, now calling it');

      //TODO: fix this in follow-up. search is on callWithRequest
      //const response = await cluster.search({});
      let response: any = cluster;
      response = { hits: { total: 0 } };

      return {
        params: req.params,
        query: req.query,
        total_count: response.hits.total
      };
    }
  );

  return router;
}
