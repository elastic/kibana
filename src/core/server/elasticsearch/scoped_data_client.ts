/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Client } from 'elasticsearch';
import { Headers } from '../http/router/headers';
import { callAPI } from './call_api';

export interface CallAPIOptions {
  wrap401Errors: boolean;
}
export interface CallAPIClientParams {
  [key: string]: any;
}

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
  public call(
    endpoint: string,
    clientParams: CallAPIClientParams = {},
    options: CallAPIOptions = { wrap401Errors: true }
  ): any {
    clientParams = { ...clientParams, headers: this.headers };

    return callAPI(this.client, endpoint, clientParams, options);
  }
}
