import { Client } from 'elasticsearch';
import { callAPI } from './call_api';

type CallAPIOptions = { wrap401Errors?: boolean };
type CallAPIClientParams = { [key: string]: any };

interface AdminClientSettings {
  client: Client;
}

export class AdminClient {
  private readonly client: Client;

  constructor(settings: AdminClientSettings) {
    this.client = settings.client;
  }

  call(
    endpoint: string,
    clientParams: CallAPIClientParams = {},
    options: CallAPIOptions = {},
  ): any {
    return callAPI(this.client, endpoint, clientParams, options);
  }
}
