import { KibanaClassPlugin, Logger, KibanaPluginFeatures } from 'kbn-types';

import { PidConfig } from './PidConfig';
import { PidService } from './PidService';

export class PidPlugin implements KibanaClassPlugin<void> {
  log: Logger;
  pidService: PidService;

  constructor(kibana: KibanaPluginFeatures) {
    this.log = kibana.logger.get();

    const config$ = kibana.config.createIfExists(PidConfig);
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
