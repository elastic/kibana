import { KibanaFunctionalPlugin } from '../../server/plugins/types';
import { XPackPluginType } from '../xpack';

export const dependencies = ['xpack'];

type TimelionFunction = () => void;

interface TimelionExports {
  registerFunction: (pluginName: string, fn: TimelionFunction) => void;
}

export interface TimelionPluginType {
  timelion: TimelionExports
}

export const plugin: KibanaFunctionalPlugin<XPackPluginType, TimelionExports> = (kibana, dependencies) => {
  const { xpack } = dependencies;

  const log = kibana.logger.get();

  xpack.config$.subscribe(config => {
    log.debug(`polling frequency: ${config.pollingFrequencyInMillis}`);
  });

  const registerFunction = (pluginName: string, timelionFunction: TimelionFunction) => {
    log.info(`received function from: ${pluginName}`);
    timelionFunction();
  }

  return {
    registerFunction
  }
}
