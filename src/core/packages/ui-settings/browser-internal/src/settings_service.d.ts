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
import type { SettingsStart, SettingsSetup } from '@kbn/core-ui-settings-browser';
export interface SettingsServiceDeps {
  http: InternalHttpSetup;
  injectedMetadata: InternalInjectedMetadataSetup;
}
/** @internal */
export declare class SettingsService {
  private uiSettingsApi?;
  private uiSettingsClient?;
  private uiSettingsGlobalClient?;
  private done$;
  setup({ http, injectedMetadata }: SettingsServiceDeps): SettingsSetup;
  start(): SettingsStart;
  stop(): void;
}
