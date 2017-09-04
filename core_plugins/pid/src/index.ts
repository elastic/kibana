import { KibanaPlugin } from 'kbn-types';
import { PidPlugin } from './PidPlugin';

export const plugin: KibanaPlugin<{}> = {
  configPath: ['pid'],
  dependencies: [],
  plugin: PidPlugin
};
