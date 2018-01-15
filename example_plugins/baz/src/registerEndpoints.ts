import { Observable } from '@elastic/kbn-observable';
import {
  Router,
  LoggerFactory,
  ElasticsearchService,
  KibanaConfig
} from '@elastic/kbn-types';
import { BazService } from './BazService';

export function registerEndpoints(
  router: Router,
  logger: LoggerFactory,
  elasticsearch: ElasticsearchService,
  config$: Observable<KibanaConfig>
) {
  const log = logger.get('routes');

  router.get(
    {
      path: '/fail'
    },
    async (req, res) => {
      log.info(`GET should fail`);

      return res.badRequest(new Error('nope'));
    }
  );

  router.get(
    {
      path: '/:type',
      validate: schema => ({
        params: schema.object({
          type: schema.string()
        }),
        query: schema.object({
          page: schema.maybe(
            schema.number({
              min: 1
            })
          ),
          per_page: schema.maybe(
            schema.number({
              min: 1
            })
          )
        })
      })
    },
    async (req, res) => {
      log.info('handle Baz route');
      const { params, query } = req;

      log.info('create Baz Service instance');

      // TODO: keep headers on all requests

      const client = await elasticsearch.getScopedDataClient(req.headers);

      const bazService = new BazService(client, config$);

      log.info(
        'use Baz Service instance to hit elasticsearch with the right cluster'
      );
      const items = await bazService.find({
        type: params.type,
        page: query.page,
        perPage: query.per_page
      });

      return res.ok(items);
    }
  );
}
