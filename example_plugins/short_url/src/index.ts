import { KibanaPluginConfig } from '@elastic/kbn-types';
import { ShortUrlService } from './ShortUrlService';
import { registerEndpoints } from './registerEndpoints';

export const plugin: KibanaPluginConfig<{}> = {
  // pretend like this plugin depends on indexPatterns:
  // - indexPatterns isn't needed in every place in kibana
  // so we can make it a separate dependency
  // do this by declaring it in dependencies
  dependencies: ['indexPatterns'],
  plugin: (kibana, dependencies) => {
    // this plugin depends on uiSettings and savedObjects:
    // which seem like they're needed in a lot of
    // places in kibana, so make them part of core
    // here we pull them out of kibana
    const {
      kibana: _kibana,
      elasticsearch,
      logger,
      util,
      http,
      UiSettingsService,
      SavedObjectsService,
    } = kibana;

    // here we pull indexPatterns out of dependencies
    const { indexPatterns } = dependencies;

    // example of creating a logger with a context
    const log = logger.get('shortUrlService');

    log.info('creating ShortUrl plugin');

    const router = http.createAndRegisterRouter('/api/shortUrl');

    // what we pass into registerEndpoints
    // is actually available in the endpoint def
    // as well as the handler function for the
    // route
    registerEndpoints(router, logger, util.schema);
  }
};

