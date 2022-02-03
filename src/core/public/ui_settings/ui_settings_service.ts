/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Subject } from 'rxjs';

import { HttpSetup } from '../http';
import { InjectedMetadataSetup } from '../injected_metadata';

import { UiSettingsApi } from './ui_settings_api';
import { UiSettingsClient } from './ui_settings_client';
import { IUiSettingsClient } from './types';

export interface UiSettingsServiceDeps {
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
    http.addLoadingCountSource(this.uiSettingsApi.getLoadingCount$());

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
