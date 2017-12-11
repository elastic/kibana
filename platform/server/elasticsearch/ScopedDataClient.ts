import { Client } from 'elasticsearch';
import { callAPI } from './call_api';
import { Headers, filterHeaders } from '../http/Router/headers';
import { ElasticsearchConfig } from '../elasticsearch/ElasticsearchConfig';

type CallAPIOptions = { wrap401Errors?: boolean };
type CallAPIClientParams = { [key: string]: any };

// TODO: eventually do this:
//export class ScopedDataClient extends DataClient {
export class ScopedDataClient {
  constructor(
    private readonly client: Client,
    private readonly headers: Headers,
    private readonly config: ElasticsearchConfig,
  ) {
  }

  call(
    endpoint: string | string[],
    clientParams: CallAPIClientParams = {},
    options: CallAPIOptions = {},
  ): any {
    if (this.headers) {
      const filteredHeaders = getFilteredHeaders(this.headers, this.config.requestHeadersWhitelist);
      clientParams = { ...clientParams, headers: filteredHeaders };
    }

    return callAPI(this.client, endpoint, clientParams, options);
  }
}

function getFilteredHeaders(headers: Headers, headersToKeep: string[]) {
  return filterHeaders(headers, headersToKeep);
}
