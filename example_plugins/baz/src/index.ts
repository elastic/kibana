import { KibanaPluginConfig } from 'kbn-types';
import { BazService } from './BazService';
import { registerEndpoints } from './registerEndpoints';

export const plugin: KibanaPluginConfig<{}> = {
  plugin: kibana => {
    const { kibana: _kibana, elasticsearch, logger, util, http } = kibana;

    const log = logger.get();

    log.info('creating Baz plugin');

    const router = http.createAndRegisterRouter('/api/baz', {
      onRequest: req =>
        new BazService(req, _kibana.config$, elasticsearch.service)
    });

    registerEndpoints(router, logger, util.schema);
  }
};
