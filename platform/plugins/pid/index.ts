import { KibanaPlugin } from '../../server/plugins/types';
import { KibanaPluginFeatures } from '../../types';
import { Logger } from '../../logger'

import { PidConfig } from './PidConfig';
import { PidService } from './PidService';

export const dependencies = [];

export const plugin = class implements KibanaPlugin<void> {
  log: Logger;
  pidService: PidService;

  constructor(kibana: KibanaPluginFeatures) {
    this.log = kibana.logger.get();

    const config$ = kibana.config.optionalAtPath('pid', PidConfig);
    this.pidService = new PidService(config$, kibana.logger);
  }

  start() {
    this.log.info('starting PidService');
    this.pidService.start();
  }

  stop() {
    this.log.info('stopping PidService');
    this.pidService.stop();
  }
}
