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
import { get } from 'lodash';

export interface CallAPIOptions {
  wrap401Errors: boolean;
}
export interface CallAPIClientParams {
  [key: string]: any;
}

export async function callAPI(
  client: Client,
  endpoint: string,
  clientParams: CallAPIClientParams,
  options: CallAPIOptions = { wrap401Errors: true }
) {
  const clientPath = endpoint.split('.');
  const api: any = get(client, clientPath);

  if (api === undefined) {
    throw new Error(`called with an invalid endpoint: ${endpoint}`);
  }

  const apiContext = clientPath.length === 1 ? client : get(client, clientPath.slice(0, -1));

  try {
    return await api.call(apiContext, clientParams);
  } catch (err) {
    if (options.wrap401Errors && err.statusCode === 401) {
      // TODO: decide on using homegrown error lib or boom
      // https://github.com/elastic/kibana/issues/12464

      err.wrap401Errors = true;
      throw err;
    }

    throw err;
  }
}
