import { KibanaFunctionalPlugin } from 'kbn-types';
import { TimelionPluginType } from 'kibana-plugin-timelion';
import { TimelionPluginBType } from 'kibana-plugin-timelion-plugin-b';

export const configPath = undefined;

export const dependencies = ['timelion', 'timelionPluginB'];

export const plugin: KibanaFunctionalPlugin<
  TimelionPluginType & TimelionPluginBType
> = (kibana, dependencies) => {
  const { timelion, timelionPluginB } = dependencies;

  const log = kibana.logger.get();

  timelion.registerFunction('timelionPluginA', () => {
    log.info('called by timelion');
  });

  log.debug(`timelionPluginB.myValue: ${timelionPluginB.myValue}`);
  log.debug(`timelionPluginB.myFunc(): ${timelionPluginB.myFunc()}`);
};
