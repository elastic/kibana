/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InternalInjectedMetadataSetup } from '@kbn/core-injected-metadata-browser-internal';
import type { InternalHttpSetup } from '@kbn/core-http-browser-internal';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
export interface UiSettingsServiceDeps {
  http: InternalHttpSetup;
  injectedMetadata: InternalInjectedMetadataSetup;
}
/**
 * @Internal
 * @Deprecated
 **/
export declare class UiSettingsService {
  private uiSettingsApi?;
  private uiSettingsClient?;
  private done$;
  setup({ http, injectedMetadata }: UiSettingsServiceDeps): IUiSettingsClient;
  start(): IUiSettingsClient;
  stop(): void;
}
