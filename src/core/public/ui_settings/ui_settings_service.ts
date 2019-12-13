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
import { Subject } from 'rxjs';

import { HttpSetup } from '../http';
import { InjectedMetadataSetup } from '../injected_metadata';

import { UiSettingsApi } from './ui_settings_api';
import { UiSettingsClient } from './ui_settings_client';
import { IUiSettingsClient } from './types';

interface UiSettingsServiceDeps {
  http: HttpSetup;
  injectedMetadata: InjectedMetadataSetup;
}

/** @internal */
export class UiSettingsService {
  private uiSettingsApi?: UiSettingsApi;
  private uiSettingsClient?: UiSettingsClient;
  private done$ = new Subject();

  public setup({ http, injectedMetadata }: UiSettingsServiceDeps): IUiSettingsClient {
    this.uiSettingsApi = new UiSettingsApi(http);
    http.addLoadingCount(this.uiSettingsApi.getLoadingCount$());

    // TODO: Migrate away from legacyMetadata https://github.com/elastic/kibana/issues/22779
    const legacyMetadata = injectedMetadata.getLegacyMetadata();

    this.uiSettingsClient = new UiSettingsClient({
      api: this.uiSettingsApi,
      defaults: legacyMetadata.uiSettings.defaults,
      initialSettings: legacyMetadata.uiSettings.user,
      done$: this.done$,
    });

    return this.uiSettingsClient;
  }

  public start(): IUiSettingsClient {
    return this.uiSettingsClient!;
  }

  public stop() {
    this.done$.complete();

    if (this.uiSettingsApi) {
      this.uiSettingsApi.stop();
    }
  }
}
