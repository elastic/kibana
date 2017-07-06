import { KibanaFunctionalPlugin } from '../../server/plugins/types';
import { XPackPluginType } from '../xpack';
import { ReportingConfig } from './ReportingConfig';

export const configPath = ['xpack', 'reporting'];

export const dependencies = ['xpack'];

export const plugin: KibanaFunctionalPlugin<XPackPluginType> = (
  kibana,
  dependencies
) => {
  const { xpack } = dependencies;

  const log = kibana.logger.get();

  const config$ = kibana.config.createIfExists(ReportingConfig);

  // just an example
  const isEnabled$ = config$.map(config => config && config.enabled);

  isEnabled$.subscribe(isEnabled => {
    log.info(`reporting enabled? [${isEnabled}]`);
  });

  xpack.config$.subscribe(xpackConfig => {
    log.info(
      `xpack polling frequency: [${xpackConfig.pollingFrequencyInMillis}]`
    );
  });
};
