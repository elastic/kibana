import { KibanaPluginConfig } from 'kbn-types';
import { PidPlugin } from './PidPlugin';

export const plugin: KibanaPluginConfig<{}> = {
  configPath: ['pid'],
  plugin: PidPlugin
};
