import { KibanaFunctionalPlugin } from 'kbn-types';
import { TimelionPluginType } from 'kibana-plugin-timelion';

import { TimelionPluginBExports } from './exports';

export const configPath = undefined;

export const dependencies = ['timelion'];

export const plugin: KibanaFunctionalPlugin<
  TimelionPluginType,
  TimelionPluginBExports
> = (kibana, dependencies) => {
  const { timelion } = dependencies;

  const log = kibana.logger.get();

  timelion.registerFunction('timelionPluginB', () => {
    log.info('called by timelion');
  });

  // log.warn(`no access to xpack, even if transitive dep: ${dependencies.xpack}`);

  return {
    myValue: 'test',
    myFunc: () => (Math.random() > 0.5 ? 'yes' : 'no')
  };
};
