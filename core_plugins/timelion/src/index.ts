import { KibanaPlugin } from 'kbn-types';
import { XPackPluginType } from 'kibana-plugin-xpack';

import { TimelionExports, TimelionFunction } from './TimelionExports';

export const plugin: KibanaPlugin<
  XPackPluginType,
  TimelionExports
> = {
  configPath: undefined,
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
}
