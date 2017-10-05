import { KibanaPluginConfig } from 'kbn-types';
import { XPackPluginType } from 'kibana-plugin-xpack';

import { TimelionExports, TimelionPluginType, TimelionFunction } from './TimelionExports';

export { TimelionPluginType, TimelionFunction };

/** @internal */
export const plugin: KibanaPluginConfig<XPackPluginType, TimelionExports> = {
  dependencies: ['xpack'],
  plugin: (kibana, dependencies) => {
    const { xpack } = dependencies;

    const log = kibana.logger.get();

    xpack.config$.subscribe(config => {
      log.debug(`polling frequency: ${config.pollingFrequency}`);
    });

    const registerFunction = (
      pluginName: string,
      timelionFunction: TimelionFunction
    ) => {
      log.info(`received function from: ${pluginName}`);
      timelionFunction();
    };

    return {
      registerFunction
    };
  }
};
