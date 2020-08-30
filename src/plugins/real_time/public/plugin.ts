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
import { REAL_TIME_API_PATH } from '../common';

/* eslint-disable @typescript-eslint/no-empty-interface */
export interface RealTimePluginSetupDependencies {}

export interface RealTimePluginStartDependencies {}

export interface RealTimePluginSetup {}

export interface RealTimesPluginStart {}
/* eslint-enable @typescript-eslint/no-empty-interface */

export class RealTimePlugin
  implements
    Plugin<
      RealTimePluginSetup,
      RealTimesPluginStart,
      RealTimePluginSetupDependencies,
      RealTimePluginStartDependencies
    > {
  constructor(initializerContext: PluginInitializerContext) {}

  public setup(
    core: CoreSetup<RealTimePluginStartDependencies, unknown>,
    plugins: RealTimePluginSetupDependencies
  ): RealTimePluginSetup {
    return {};
  }

  public start(core: CoreStart, plugins: RealTimePluginStartDependencies): RealTimesPluginStart {
    core.http
      .post(`${REAL_TIME_API_PATH}/_rpc`, {
        body: JSON.stringify([
          1,
          'patch',
          {
            type: 'dashboard',
            id: '7adfa750-4c81-11e8-b3d7-01146121b73d',
            patch: [{ op: 'replace', path: '/title', value: 'foo bar' }],
          },
        ]),
      })
      .then((response) => {
        // eslint-disable-next-line
        console.log('real-time', response);
      });

    return {};
  }
}
