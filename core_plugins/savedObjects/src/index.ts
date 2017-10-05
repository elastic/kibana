import { KibanaPluginConfig } from 'kbn-types';
import { SavedObjectsService } from './SavedObjectsService';
import { registerEndpoints } from './registerEndpoints';

export const plugin: KibanaPluginConfig<{}> = {
  plugin: kibana => {
    const { kibana: _kibana, elasticsearch, logger, util, http } = kibana;

    const log = logger.get();

    log.info('creating savedObjects plugin');

    const router = http.createAndRegisterRouter('/api/saved_objects', {
      onRequest: req =>
        new SavedObjectsService(req, _kibana.config$, elasticsearch.service)
    });

    registerEndpoints(router, logger, util.schema);
  }
};
