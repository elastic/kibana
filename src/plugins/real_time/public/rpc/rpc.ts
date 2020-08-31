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

import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import {
  IRealTimeRpcClient,
  REAL_TIME_API_PATH,
  isPromise,
  Future,
  RpcMessageComplete,
} from '../../common';
import { HttpSetup } from '../../../../core/public';

export interface RpcClientParams {
  http: HttpSetup;
}

export class RpcClient implements IRealTimeRpcClient {
  private readonly endpoint = `${REAL_TIME_API_PATH}/_rpc`;
  private cnt = 1;

  constructor(private readonly params: RpcClientParams) {}

  private exec<T>(method: string, payload: unknown): Future<T> {
    const future = this.params.http.post(this.endpoint, {
      body: JSON.stringify([this.cnt++, method, payload]),
    });

    if (isPromise(future)) {
      return future.then((message) => {
        const [, , result] = message as RpcMessageComplete;
        return result as Promise<T>;
      });
    } else {
      return (future as Observable<RpcMessageComplete>).pipe(
        map((message) => message[2])
      ) as Observable<T>;
    }
  }

  public readonly ping: IRealTimeRpcClient['ping'] = () => this.exec('ping', null);

  public readonly patch: IRealTimeRpcClient['patch'] = (payload) => this.exec('patch', payload);
}
