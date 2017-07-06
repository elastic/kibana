import { KibanaFunctionalPlugin } from '../../server/plugins/types';
import { SavedObjectsService } from './SavedObjectsService';
import { registerEndpoints } from './registerEndpoints';

export const configPath = undefined;

export const dependencies = [];

export const plugin: KibanaFunctionalPlugin<{}> = kibana => {
  const { kibana: _kibana, elasticsearch, logger, util, http } = kibana;

  const log = logger.get();

  log.info('creating savedObjects plugin');

  const router = http.createAndRegisterRouter('/api/saved_objects', {
    onRequest: req =>
      new SavedObjectsService(req, _kibana.config$, elasticsearch.service)
  });

  registerEndpoints(router, logger, util.schema);
};
