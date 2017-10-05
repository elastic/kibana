import { KibanaPluginConfig } from 'kbn-types';

import { XPackConfig } from './XPackConfig';
import { XPackExports, XPackPluginType } from './XPackExports';

export { XPackConfig, XPackPluginType };

/** @internal */
export const plugin: KibanaPluginConfig<{}, XPackExports> = {
  configPath: ['xpack', 'xpack_main'],
  plugin: kibana => {
    const log = kibana.logger.get();

    log.info('xpack is running');

    const config$ = kibana.config.create(XPackConfig);

    return {
      config$
    };
  }
};
