import { KibanaFunctionalPlugin } from 'kbn-types';

import { XPackConfig } from './XPackConfig';
import { XPackExports } from './XPackExports';

export const configPath = ['xpack', 'xpack_main'];

export const dependencies = [];

export const plugin: KibanaFunctionalPlugin<{}, XPackExports> = kibana => {
  const log = kibana.logger.get();

  log.info('xpack is running');

  const config$ = kibana.config.create(XPackConfig);

  return {
    config$
  };
};
