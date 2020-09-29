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

import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
} from '../../../../src/core/public';
import { IRealTimeRpcClient, toPromise } from '../common';
import { RpcClient } from './rpc';

/* eslint-disable @typescript-eslint/no-empty-interface */
export interface RealTimePluginSetupDependencies {}

export interface RealTimePluginStartDependencies {}
/* eslint-enable @typescript-eslint/no-empty-interface */

export interface RealTimePluginSetup {
  rpc: IRealTimeRpcClient;
}

export interface RealTimePluginStart {
  rpc: IRealTimeRpcClient;
}

export class RealTimePlugin
  implements
    Plugin<
      RealTimePluginSetup,
      RealTimePluginStart,
      RealTimePluginSetupDependencies,
      RealTimePluginStartDependencies
    > {
  private rpc?: RpcClient;

  constructor(initializerContext: PluginInitializerContext) {}

  public setup(
    { http }: CoreSetup<RealTimePluginStartDependencies, unknown>,
    plugins: RealTimePluginSetupDependencies
  ): RealTimePluginSetup {
    const rpc = (this.rpc = new RpcClient({ http }));

    return { rpc };
  }

  public start(core: CoreStart, plugins: RealTimePluginStartDependencies): RealTimePluginStart {
    const { rpc } = this;

    toPromise(this.rpc!.ping(null)).then((value) => {
      // eslint-disable-next-line
      console.log(value);
    });

    return { rpc: rpc! };
  }
}
