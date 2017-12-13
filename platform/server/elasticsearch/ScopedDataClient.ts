import { Client } from 'elasticsearch';
import { callAPI } from './call_api';
import { Headers } from '../http/Router/headers';

type CallAPIOptions = { wrap401Errors?: boolean };
type CallAPIClientParams = { [key: string]: any };

// TODO: eventually do this:
//export class ScopedDataClient extends DataClient {
export class ScopedDataClient {
  constructor(
    private readonly client: Client,
    private readonly headers: Headers
  ) {}

  call(
    endpoint: string,
    clientParams: CallAPIClientParams = {},
    options: CallAPIOptions = {}
  ): any {
    clientParams = { ...clientParams, headers: this.headers };

    return callAPI(this.client, endpoint, clientParams, options);
  }
}
