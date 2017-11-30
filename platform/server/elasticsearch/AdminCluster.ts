import { Client } from 'elasticsearch';

import { ElasticsearchConfig } from './ElasticsearchConfig';
import { Logger, LoggerFactory } from '../../logging';

export class AdminCluster {
  private readonly log: Logger;
  private readonly noAuthClient: Client;

  constructor(
    private readonly config: ElasticsearchConfig,
    logger: LoggerFactory
  ) {
    this.log = logger.get('elasticsearch', 'client', this.config.clusterType);

    this.noAuthClient = new Client(
      config.toElasticsearchClientConfig({
        shouldAuth: false
      })
    );

    this.log.info('clients created');
  }

  close() {
    this.noAuthClient.close();

    this.log.info('cluster client stopped');
  }

  call(endpoint: string, clientParams = {}, options = {}): any {
    return {};
  }
}

