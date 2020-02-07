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

import { KbnClientStatus } from './kbn_client_status';

const PLUGIN_STATUS_ID = /^plugin:(.+?)@/;

export class KbnClientPlugins {
  constructor(private readonly status: KbnClientStatus) {}
  /**
   * Get a list of plugin ids that are enabled on the server
   */
  public async getEnabledIds() {
    const pluginIds: string[] = [];
    const apiResp = await this.status.get();

    for (const status of apiResp.status.statuses) {
      if (status.id) {
        const match = status.id.match(PLUGIN_STATUS_ID);
        if (match) {
          pluginIds.push(match[1]);
        }
      }
    }

    return pluginIds;
  }
}
