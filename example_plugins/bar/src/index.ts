import { KibanaPluginConfig } from 'kbn-types';

import { BarConfig } from './BarConfig';
import { BarExports, BarPluginType } from './BarExports';

export { BarConfig, BarPluginType };

/** @internal */
export const plugin: KibanaPluginConfig<{}, BarExports> = {
  configPath: ['bar'],
  plugin: kibana => {
    const log = kibana.logger.get();

    log.info('bar is running');

    return {
      myValue: "I'm bar!"
    };
  }
};
