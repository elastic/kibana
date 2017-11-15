import { KibanaPluginConfig } from '@elastic/kbn-types';
import { registerEndpoints } from './registerEndpoints';

export const plugin: KibanaPluginConfig<{}> = {
  plugin: kibana => {
    log.info('create Baz plugin');

    const { elasticsearch, logger, util, http, config } = kibana;

    const log = logger.get();

    const router = http.createAndRegisterRouter('/api/baz');

    log.info('register Baz endpoints');
    registerEndpoints(router, logger, util.schema, elasticsearch, http, config);
  }
};
