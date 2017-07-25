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

  // Attempt at typing the current `callWithRequest`, which is really difficult
  // to type properly the way it is right now.
  // TODO This should _return_ a client preset with the headers, but this
  // requires changing Elasticsearch.js
  async withRequest<T>(
    req: KibanaRequest,
    cb: (client: Client, headers: { [key: string]: any }) => T,
    options: {
      wrap401Errors: boolean;
    } = {
      wrap401Errors: false
    }
  ) {
    const headers = req.getFilteredHeaders(this.config.requestHeadersWhitelist);

    try {
      return await cb(this.client, headers);
    } catch (err) {
      // instanceof err check?

      if (options.wrap401Errors && err.statusCode === 401) {
        console.log('401 + wrap', err);
        throw err;

        // From current Kibana:

        // const boomError = Boom.wrap(err, err.statusCode);
        // const wwwAuthHeader = get(err, 'body.error.header[WWW-Authenticate]');
        // boomError.output.headers['WWW-Authenticate'] = wwwAuthHeader || 'Basic realm="Authorization Required"';

        // throw boomError;
      }

      console.log('request failed yo', err);
      throw err;
    }
  }
}
