import { Observable } from 'rxjs';

import { KibanaFunctionalPlugin } from '../../server/plugins/types';
import { XPackConfig } from './XPackConfig';

export const dependencies = [];

interface XPackExports {
  config$: Observable<XPackConfig>
}

export interface XPackPluginType {
  xpack: XPackExports
}

export const plugin: KibanaFunctionalPlugin<{}, XPackExports> = kibana => {
  const log = kibana.logger.get();

  log.info('xpack is running');

  const config$ = kibana.config.atPath(['xpack', 'xpack_main'], XPackConfig);

  return {
    config$
  }
}
