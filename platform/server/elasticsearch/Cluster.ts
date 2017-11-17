import { Client } from 'elasticsearch';

import { ElasticsearchConfig } from './ElasticsearchConfig';
import { Logger, LoggerFactory } from '../../logging';

export class Cluster {
  private readonly log: Logger;
  private readonly client: Client;
  private readonly noAuthClient: Client;

  constructor(
    private readonly config: ElasticsearchConfig,
    logger: LoggerFactory
  ) {
    this.log = logger.get('elasticsearch', 'client', this.config.clusterType);

    this.client = new Client(this.config.toElasticsearchClientConfig());
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

  callWithRequest(endpoint: string, clientParams = {}, options = {}): any {
    return {};
    //if (req.headers) {
    //  const filteredHeaders = filterHeaders(req.headers, this.getRequestHeadersWhitelist());
    //  set(clientParams, 'headers', filteredHeaders);
    //}

    //return callAPI(this._noAuthClient, endpoint, clientParams, options);
  }

  //callWithInternalUser = (endpoint, clientParams = {}, options = {}) => {
  //  return callAPI(this._client, endpoint, clientParams, options);
  //}
}
