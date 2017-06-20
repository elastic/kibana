import { KibanaFunctionalPlugin } from '../../server/plugins/types';
import { TimelionPluginType } from '../timelion'
import { TimelionPluginBType } from '../timelionPluginB'

export const dependencies = ['timelion', 'timelionPluginB'];

export const plugin: KibanaFunctionalPlugin<TimelionPluginType & TimelionPluginBType> = (kibana, dependencies) => {
  const { timelion, timelionPluginB } = dependencies;

  const log = kibana.logger.get();

  timelion.registerFunction('timelionPluginA', () => {
    log.info('called by timelion');
  });

  log.debug(`timelionPluginB.myValue: ${timelionPluginB.myValue}`);
  log.debug(`timelionPluginB.myFunc(): ${timelionPluginB.myFunc()}`);
}
