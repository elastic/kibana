import { Router } from '../http';
import { object, string, maybe } from '../../lib/schema';
import { ElasticsearchRequestHelpers } from './ElasticsearchFacade';
import { ElasticsearchService } from './ElasticsearchService';
import { LoggerFactory } from '../../logging';

export function registerElasticsearchRoutes(
  router: Router<ElasticsearchRequestHelpers>,
  logger: LoggerFactory,
  service: ElasticsearchService,
) {
  const log = logger.get('elasticsearch', 'routes');

  log.info('creating elasticsearch api');

  router.get(
    {
      path: '/:field',
      validate: {
        params: object({
          field: string(),
        }),
        query: object({
          key: maybe(string()),
        }),
      },
    },
    async (req, res) => {
      // WOHO! Both of these are typed!
      log.info(`field param: ${req.params.field}`);
      log.info(`query param: ${req.query.key}`);

      // The following code needs work. We don't have `withRequest`
      // anymore.
      log.info('request received on [data] cluster');

      const cluster = await service.getScopedCluster('data', req.headers);

      log.info('got scoped [data] cluster, now calling it');

      // TODO: for some reason my typescript
      // is saying `search` isn't on this object
      const response = await cluster.search({});

      return {
        params: req.params,
        query: req.query,
        total_count: response.hits.total
      };
    }
  );

  return router;
}
