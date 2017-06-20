import { Router } from '../../server/http';
import { LoggerFactory } from '../../logger'
import { Schema } from '../../types';
import { SavedObjectsFacade } from './SavedObjectsFacade';

export function registerEndpoints(
  router: Router<SavedObjectsFacade>,
  logger: LoggerFactory,
  schema: Schema
) {
  const { object, string, number, oneOf, arrayOf, maybe } = schema;
  const log = logger.get('routes');

  router.get({
    path: '/fail'
  }, async (savedObjectsFacade, req, res) => {
    log.info(`GET should fail`);

    return res.badRequest(new Error('nope'));
  });

  router.get({
    path: '/:type',
    validate: {
      params: object({
        type: string()
      }),
      query: object({
        per_page: maybe(number({
          min: 0,
          defaultValue: 20
        })),
        page: maybe(number({
          min: 0,
          defaultValue: 1
        })),
        search: maybe(string()),
        search_fields: maybe(
          oneOf([
            string(),
            arrayOf(string())
          ])
        ),
        fields: maybe(
          oneOf([
            string(),
            arrayOf(string())
          ])
        )
      })
    }
  }, async (savedObjectsFacade, req, res) => {
    const { params, query } = req;

    log.info(`[GET] request received on [saved_objects] with type [${params.type}]`);

    const savedObjects = await savedObjectsFacade.find({
      perPage: query.per_page,
      page: query.page,
      type: params.type
    });

    return res.ok(savedObjects);
    // if 200 OK we can simplify to just:
    // return savedObjects;
  });
}