import { Client } from 'elasticsearch';

import { ElasticsearchConfig } from './ElasticsearchConfig';
import { KibanaRequest } from '../http';
import { Logger, LoggerFactory } from '../../logging';

export class Cluster {
  private readonly log: Logger;
  private readonly client: Client;
  private readonly noAuthClient: Client;

  constructor(
    private readonly config: ElasticsearchConfig,
    logger: LoggerFactory
  ) {
    this.log = logger.get('elasticsearch', 'client', config.clusterType);

    this.client = new Client(config.toElasticsearchClientConfig());
    this.noAuthClient = new Client(
      config.toElasticsearchClientConfig({
        shouldAuth: false
      })
    );

    this.log.info('clients created');
  }

  close() {
    this.client.close();
    this.noAuthClient.close();

    this.log.info('cluster client stopped');
  }
  //TODO: removed withRequest, need to implement
  //callWithRequest or something
  // Should `callWithRequest`/`getCluster` even live here,
  // or in ElasticsearchService.ts?
}
