//import { k$, Observable } from '@elastic/kbn-observable';
import { KibanaPluginConfig } from '@elastic/kbn-types';
import { registerEndpoints } from './registerEndpoints';

export const plugin: KibanaPluginConfig<{}> = {
  plugin: kibana => {
    const { elasticsearch, logger, util, http } = kibana;
    const config$ =  kibana.kibana.config$;

    const log = logger.get();

    log.info('create Baz plugin');

    const router = http.createAndRegisterRouter('/api/baz');

    log.info('register Baz endpoints');
    registerEndpoints(router, logger, util.schema, elasticsearch.service, config$);
  }
};
