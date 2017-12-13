import { Client } from 'elasticsearch';
import { callAPI } from './call_api';

type CallAPIOptions = { wrap401Errors?: boolean };
type CallAPIClientParams = { [key: string]: any };

export class AdminClient {
  constructor(private readonly client: Client) {}

  call(
    endpoint: string,
    clientParams: CallAPIClientParams = {},
    options: CallAPIOptions = {}
  ): any {
    return callAPI(this.client, endpoint, clientParams, options);
  }
}
