import { Client } from 'elasticsearch';

import { ElasticsearchConfig } from './ElasticsearchConfig';
import { Logger, LoggerFactory } from '../../logging';

export class DataCluster {
  private readonly log: Logger;
  private readonly client: Client;

  constructor(
    private readonly config: ElasticsearchConfig,
    logger: LoggerFactory,
  ) {
    this.log = logger.get('elasticsearch', 'client', this.config.clusterType);

    this.client = new Client(this.config.toElasticsearchClientConfig());
  }

  close() {
    this.client.close();
    this.log.info('cluster client stopped');
  }

  call(endpoint: string, clientParams = {}, options = {}): any {
    return {};
  }
}
