import { KibanaPluginConfig } from '@elastic/kbn-types';
import { registerEndpoints } from './registerEndpoints';

export const plugin: KibanaPluginConfig<{}> = {
  plugin: kibana => {
    const { elasticsearch, logger, util, http, config } = kibana;

    const log = logger.get();

    log.info('create Baz plugin');

    const router = http.createAndRegisterRouter('/api/baz');

    //TODO: wrap `config` in an observable

    log.info('register Baz endpoints');
    registerEndpoints(router, logger, util.schema, elasticsearch.service, config);
  }
};
