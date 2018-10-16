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

import { BasePathStartContract } from '../base_path';
import { InjectedMetadataStartContract } from '../injected_metadata';
import { LoadingCountStartContract } from '../loading_count';
import { NotificationsStartContract } from '../notifications';

import { UiSettingsApi } from './ui_settings_api';
import { UiSettingsClient } from './ui_settings_client';

interface Deps {
  notifications: NotificationsStartContract;
  loadingCount: LoadingCountStartContract;
  injectedMetadata: InjectedMetadataStartContract;
  basePath: BasePathStartContract;
}

export class UiSettingsService {
  private uiSettingsApi?: UiSettingsApi;
  private uiSettingsClient?: UiSettingsClient;

  public start({ notifications, loadingCount, injectedMetadata, basePath }: Deps) {
    this.uiSettingsApi = new UiSettingsApi(basePath, injectedMetadata.getKibanaVersion());
    loadingCount.add(this.uiSettingsApi.getLoadingCount$());

    // TODO: Migrate away from legacyMetadata https://github.com/elastic/kibana/issues/22779
    const legacyMetadata = injectedMetadata.getLegacyMetadata();

    this.uiSettingsClient = new UiSettingsClient({
      api: this.uiSettingsApi,
      onUpdateError: error => {
        notifications.toasts.addDanger({
          title: 'Unable to update UI setting',
          text: error.message,
        });
      },
      defaults: legacyMetadata.uiSettings.defaults,
      initialSettings: legacyMetadata.uiSettings.user,
    });

    return this.uiSettingsClient;
  }

  public stop() {
    if (this.uiSettingsClient) {
      this.uiSettingsClient.stop();
    }

    if (this.uiSettingsApi) {
      this.uiSettingsApi.stop();
    }
  }
}

export type UiSettingsStartContract = UiSettingsClient;
