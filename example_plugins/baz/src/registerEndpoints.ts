import {
  Router,
  LoggerFactory,
  Schema,
  ElasticsearchService,
  KibanaConfig,
  HttpService
} from '@elastic/kbn-types';
import { BazService } from './BazService';

export function registerEndpoints(
  router: Router<BazService>,
  logger: LoggerFactory,
  schema: Schema,
  elasticsearch: ElasticsearchService,
  http: HttpService,
  config: KibanaConfig
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
      // TODO: but BazService needs request's headers
      // the validated object may not have this now
      // This is where BazService's underlying elasticsearch service
      // should be bound to the right cluster
      const bazService = new BazService(req.headers, config, elasticsearch);

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
