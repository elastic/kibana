import { KibanaFunctionalPlugin } from 'kbn-types';
import { XPackPluginType } from 'kibana-plugin-xpack';

import { TimelionExports, TimelionFunction } from './TimelionExports';

export const configPath = undefined;

export const dependencies = ['xpack'];

export const plugin: KibanaFunctionalPlugin<
  XPackPluginType,
  TimelionExports
> = (kibana, dependencies) => {
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
};
