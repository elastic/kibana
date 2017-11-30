import { Observable } from '@elastic/kbn-observable';
import {
  Router,
  LoggerFactory,
  Schema,
  ElasticsearchService,
  KibanaConfig,
  DataCluster,
} from '@elastic/kbn-types';
import { BazService } from './BazService';

export function registerEndpoints(
  router: Router,
  logger: LoggerFactory,
  schema: Schema,
  elasticsearch: ElasticsearchService,
  config$: Observable<KibanaConfig>
) {
  const { object, string, number, maybe } = schema;
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
      validate: {
        params: object({
          type: string()
        }),
        query: object({
          page: maybe(
            number({
              min: 1
            })
          ),
          per_page: maybe(
            number({
              min: 1
            })
          )
        })
      }
    },
    async (req, res) => {
      log.info('handle Baz route');
      const { params, query } = req;

      log.info('create Baz Service instance');

      // TODO: validate headers
      const cluster = new DataCluster(req.headers);
      const bazService = new BazService(cluster, config$);

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
