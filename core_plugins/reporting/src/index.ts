import { Observable } from 'rxjs';
import { KibanaPluginConfig } from 'kbn-types';

import { XPackPluginType } from 'kibana-plugin-xpack';
import { ReportingConfig } from './ReportingConfig';

export const plugin: KibanaPluginConfig<XPackPluginType> = {
  configPath: ['xpack', 'reporting'],
  dependencies: ['xpack'],
  plugin: (kibana, dependencies) => {
    const { xpack } = dependencies;

    const log = kibana.logger.get();

    const config$ = Observable.from(
      kibana.config.createIfExists(ReportingConfig)
    );

    // just an example
    const isEnabled$ = config$.map(config => config && config.enabled);

    isEnabled$.subscribe(isEnabled => {
      log.info(`reporting enabled? [${isEnabled}]`);
    });

    xpack.config$.subscribe(xpackConfig => {
      log.info(`xpack polling frequency: [${xpackConfig.pollingFrequency}]`);
    });
  }
};
