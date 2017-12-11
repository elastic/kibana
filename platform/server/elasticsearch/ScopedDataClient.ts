import { Client } from 'elasticsearch';
import { callAPI } from './call_api';
import { Headers, filterHeaders } from '../http/Router/headers';
import { ElasticsearchConfig } from '../elasticsearch/ElasticsearchConfig';

type CallAPIOptions = { wrap401Errors?: boolean };
type CallAPIClientParams = { [key: string]: any };

interface ScopedDataClientSettings {
  client: Client;
  headers: Headers;
  config: ElasticsearchConfig;
}

// TODO: eventually do this:
//export class ScopedDataClient extends DataClient {
export class ScopedDataClient {
  private readonly client: Client;
  private readonly headers: Headers;
  private readonly config: ElasticsearchConfig;

  constructor(settings: ScopedDataClientSettings) {
    this.client = settings.client;
    this.config = settings.config;
    this.headers = getFilteredHeaders(settings.headers, this.config.requestHeadersWhitelist);
  }

  call(
    endpoint: string,
    clientParams: CallAPIClientParams = {},
    options: CallAPIOptions = {},
  ): any {
    clientParams = { ...clientParams, headers: this.headers };

    return callAPI(this.client, endpoint, clientParams, options);
  }
}

function getFilteredHeaders(headers: Headers, headersToKeep: string[]) {
  return filterHeaders(headers, headersToKeep);
}
