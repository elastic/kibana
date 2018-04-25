import { Client } from 'elasticsearch';
import { callAPI } from './call_api';
import { Headers } from '../http/router/headers';

export type CallAPIOptions = { wrap401Errors: boolean };
export type CallAPIClientParams = { [key: string]: any };

export class ScopedDataClient {
  constructor(
    private readonly client: Client,
    private readonly headers: Headers
  ) {}

  /**
   * Call the elasticsearch API via the given client
   * which is bound to the data cluster.
   *
   * @param endpoint     Dot-delimited string that corresponds
   *                     to the endpoint path.
   * @param clientParams Params that get passed directly to the
   *                     API for the endpoint.
   * @param options      Object that can specify whether to wrap
   *                     401 errors.
   */
  call(
    endpoint: string,
    clientParams: CallAPIClientParams = {},
    options: CallAPIOptions = { wrap401Errors: true }
  ): any {
    clientParams = { ...clientParams, headers: this.headers };

    return callAPI(this.client, endpoint, clientParams, options);
  }
}
