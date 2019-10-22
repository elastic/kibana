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

import { ToolingLog } from '../tooling_log';
import { KbnClientRequester, ReqOptions } from './kbn_client_requester';
import { KbnClientStatus } from './kbn_client_status';
import { KbnClientPlugins } from './kbn_client_plugins';
import { KbnClientVersion } from './kbn_client_version';
import { KbnClientSavedObjects } from './kbn_client_saved_objects';
import { KbnClientUiSettings, UiSettingValues } from './kbn_client_ui_settings';

export class KbnClient {
  private readonly requester = new KbnClientRequester(this.log, this.kibanaUrls);
  readonly status = new KbnClientStatus(this.requester);
  readonly plugins = new KbnClientPlugins(this.status);
  readonly version = new KbnClientVersion(this.status);
  readonly savedObjects = new KbnClientSavedObjects(this.log, this.requester);
  readonly uiSettings = new KbnClientUiSettings(this.log, this.requester, this.uiSettingDefaults);

  /**
   * Basic Kibana server client that implements common behaviors for talking
   * to the Kibana server from dev tooling.
   *
   * @param log ToolingLog
   * @param kibanaUrls Array of kibana server urls to send requests to
   * @param uiSettingDefaults Map of uiSetting values that will be merged with all uiSetting resets
   */
  constructor(
    private readonly log: ToolingLog,
    private readonly kibanaUrls: string[],
    private readonly uiSettingDefaults?: UiSettingValues
  ) {
    if (!kibanaUrls.length) {
      throw new Error('missing Kibana urls');
    }
  }

  /**
   * Make a direct request to the Kibana server
   */
  async request(options: ReqOptions) {
    return await this.requester.request(options);
  }

  resolveUrl(relativeUrl: string) {
    return this.requester.resolveUrl(relativeUrl);
  }
}
