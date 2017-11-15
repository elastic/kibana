import { Router } from '../http';
import { object, string, maybe } from '../../lib/schema';
import { ElasticsearchRequestHelpers } from './ElasticsearchFacade';
import { ElasticsearchService } from './ElasticsearchService';
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
    async (req, res) => {
      // WOHO! Both of these are typed!
      log.info(`field param: ${req.params.field}`);
      log.info(`query param: ${req.query.key}`);

      // NB: All right, so at this point when we're
      // exposing the es API, shouldn't we have an
      // instance of ElasticsearchService already
      // from kibana-core? I'm a bit confused.
      //
      // My understanding is that this const elasticsearch is the
      // underlying elasticsearch-js client. But this whole
      // code lives inside of a kibana-core system that we're
      // also calling elasticsearch.
      //
      // The following code needs work. We don't have `withRequest`
      // anymore.
      const elasticsearch = new ElasticsearchService(req);

      log.info('request received on [data] cluster');

      const cluster = await elasticsearch.getClusterOfType('data');

      log.info('got [data] cluster, now calling it');

      const response = await cluster.withRequest(req, (client, headers) =>
        client.search({})
      );

      return {
        params: req.params,
        query: req.query,
        total_count: response.hits.total
      };
    }
  );

  return router;
}
