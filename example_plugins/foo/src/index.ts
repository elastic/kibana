import { KibanaPluginConfig } from 'kbn-types';
import { BarPluginType } from 'example-plugin-bar';

export const plugin: KibanaPluginConfig<BarPluginType> = {
  configPath: ['foo'],
  dependencies: ['bar'],
  plugin: (kibana, dependencies) => {
    const { bar } = dependencies;

    const log = kibana.logger.get();

    log.info('foo starting');

    log.info(`got value: ${bar.myValue}`);
  }
};
