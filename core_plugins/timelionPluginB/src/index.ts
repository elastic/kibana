import { KibanaPluginConfig } from 'kbn-types';
import { TimelionPluginType } from 'kibana-plugin-timelion';

import { TimelionPluginBExports } from './exports';

export const plugin: KibanaPluginConfig<
  TimelionPluginType,
  TimelionPluginBExports
> = {
  dependencies: ['timelion'],
  plugin: (kibana, dependencies) => {
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
  }
};
