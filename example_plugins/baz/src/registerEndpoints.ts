import { Router, LoggerFactory, Schema } from 'kbn-types';
import { BazService } from './BazService';

export function registerEndpoints(
  router: Router<BazService>,
  logger: LoggerFactory,
  schema: Schema
) {
  const { object, string, number, maybe } = schema;
  const log = logger.get('routes');

  router.get(
    {
      path: '/fail'
    },
    async (bazService, req, res) => {
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
    async (bazService, req, res) => {
      const { params, query } = req;

      const items = await bazService.find({
        type: params.type,
        page: query.page,
        perPage: query.per_page
      });

      return res.ok(items);
    }
  );
}
