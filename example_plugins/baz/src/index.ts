import { KibanaPluginConfig } from '@kbn/types';
import { registerEndpoints } from './register_endpoints';

export const plugin: KibanaPluginConfig<{}> = {
  plugin: kibana => {
    const { elasticsearch, logger, http } = kibana;
    const config$ = kibana.kibana.config$;

    const log = logger.get();

    log.info('create Baz plugin');

    const router = http.createAndRegisterRouter('/api/baz');

    log.info('register Baz endpoints');
    registerEndpoints(router, logger, elasticsearch.service, config$);
  },
};
