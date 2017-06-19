import { KibanaFunctionalPlugin } from '../../server/plugins/types';
import { TimelionPluginType } from '../timelion'

interface TimelionPluginBExports {
  myValue: string,
  myFunc: () => string;
}

export interface TimelionPluginBType {
  timelionPluginB: TimelionPluginBExports
};

export const dependencies = ['timelion'];

export const plugin: KibanaFunctionalPlugin<TimelionPluginType, TimelionPluginBExports> = (kibana, dependencies) => {
  const { timelion } = dependencies;

  const log = kibana.logger.get();

  timelion.registerFunction('timelionPluginB', () => {
    log.info('called by timelion');
  });

  log.warn(`intentionally no access to xpack even if transitive dep: ${(dependencies as any).xpack}`)

  return {
    myValue: 'test',
    myFunc: () => Math.random() > 0.5 ? 'yes' : 'no'
  }
}
