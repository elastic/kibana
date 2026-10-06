/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BehaviorSubject } from 'rxjs';
import type { PackageInfo } from '@kbn/config';
import type { KibanaRequest, HttpAuth } from '@kbn/core-http-server';
import { type ThemeName } from '@kbn/core-ui-settings-common';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-server';
import type { UiPlugins } from '@kbn/core-plugins-base-server-internal';
import type { InternalUserSettingsServiceSetup } from '@kbn/core-user-settings-server-internal';
export type BootstrapRendererFactory = (factoryOptions: FactoryOptions) => BootstrapRenderer;
export type BootstrapRenderer = (options: RenderedOptions) => Promise<RendererResult>;
interface FactoryOptions {
  /** Can be a URL, in the case of a CDN, or a base path if serving from Kibana */
  baseHref: string;
  packageInfo: PackageInfo;
  uiPlugins: UiPlugins;
  auth: HttpAuth;
  userSettingsService?: InternalUserSettingsServiceSetup;
  themeName$: BehaviorSubject<ThemeName>;
}
interface RenderedOptions {
  request: KibanaRequest;
  uiSettingsClient: IUiSettingsClient;
  isAnonymousPage?: boolean;
}
interface RendererResult {
  body: string;
  etag: string;
}
export declare const bootstrapRendererFactory: BootstrapRendererFactory;
export {};
