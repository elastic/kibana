import { Client } from 'elasticsearch';
import { callAPI } from './call_api';

export type CallAPIOptions = { wrap401Errors: boolean };
export type CallAPIClientParams = { [key: string]: any };

export class AdminClient {
  constructor(private readonly client: Client) {}

  /**
   * Call the elasticsearch API via the given client
   * which is bound to the admin cluster.
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
    return callAPI(this.client, endpoint, clientParams, options);
  }
}
