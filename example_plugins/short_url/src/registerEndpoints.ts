import { Router, LoggerFactory, Schema } from 'kbn-types';
import { ShortUrlService } from './ShortUrlService';

export function registerEndpoints(
  router: Router<ShortUrlService>,
  logger: LoggerFactory,
  schema: Schema,
  config,
  SavedObjectsService,
  UiSettingsService,
  elasticsearch,
) {
  const { object, string, number, maybe } = schema;
  const log = logger.get('routes');

  router.get(
    {
      path: '/goto/:urlId',
      validate: {
        params: object({
          urlId: string(),
        }),
      },
    },
    async (request, response) => {
      log.info(`goto the url given the short id`);
      const { urlId } = request.params;
      try {
        const savedObjectsService = new SavedObjectsService(request, elasticsearch);

        const uiSettingsService = new UiSettingsService(request, savedObjectsService);

        const shortUrlLookup = new ShortUrlService(server.log, savedObjectsService);

        const url = await shortUrlLookup.getUrl(urlId);

        const stateStoreInSessionStorage = await uiSettingsService.get('state:storeInSessionStorage');
        if (!stateStoreInSessionStorage) {
          response().redirect(config.get('server.basePath') + url);
          return;
        }

        const app = kbnServer.uiExports.apps.byId.stateSessionStorageRedirect;
        response.renderApp(app, {
          redirectUrl: url,
        });
      } catch (err) {
        response(handleShortUrlError(err));
      }
    }
  );

  router.post(
    {
      path: '/shorten',
      validate: {
        payload: object({
          url: string(),
        }),
      },
    },
    async (request, response) => {
      try {
        const { url } = request.payload;

        const savedObjectsService = new SavedObjectsService(request, elasticsearch);

        const shortUrlLookup = new ShortUrlLookup(server.log, savedObjectsService);

        const urlId = await shortUrlLookup.generateUrlId(url);
        response(urlId);
      } catch (err) {
        response(handleShortUrlError(err));
      }
    }
  );
}

