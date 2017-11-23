import { KibanaPluginConfig } from '@elastic/kbn-types';
import { BazService } from './BazService';
import { registerEndpoints } from './registerEndpoints';

export const plugin: KibanaPluginConfig<{}> = {
  // index patterns isn't needed in every place in kibana, so we can
  // make it a separate dependency
  depedencies: ['indexPatterns'],
  plugin: (kibana, dependencies) => {
    // uisettings and savedObjects seem like they're needed in a lot of
    // places in kibana, so make them part of core
    const { kibana: _kibana, elasticsearch, logger, util, http, UiSettingsService, SavedObjectsService } = kibana;

    const { indexPatterns } = dependencies;

    const log = logger.get();

    log.info('creating Baz plugin');

    const router = http.createAndRegisterRouter('/api/baz', {
      onRequest: req =>
        new BazService(req, _kibana.config$, elasticsearch.service)
    });

    registerEndpoints(router, logger, util.schema);
  }
};
