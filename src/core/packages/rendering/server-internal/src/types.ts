/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ThemeVersion } from '@kbn/ui-shared-deps-npm';
import type { InjectedMetadata } from '@kbn/core-injected-metadata-common-internal';
import type { KibanaRequest, ICspConfig } from '@kbn/core-http-server';
import type {
  InternalHttpServicePreboot,
  InternalHttpServiceSetup,
} from '@kbn/core-http-server-internal';
import type { InternalElasticsearchServiceSetup } from '@kbn/core-elasticsearch-server-internal';
import type { InternalStatusServiceSetup } from '@kbn/core-status-server-internal';
import type { DarkModeValue } from '@kbn/core-ui-settings-common';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-server';
import type { UiPlugins } from '@kbn/core-plugins-base-server-internal';
import type { InternalCustomBrandingSetup } from '@kbn/core-custom-branding-server-internal';
import type { CustomBranding } from '@kbn/core-custom-branding-common';
import type { InternalUserSettingsServiceSetup } from '@kbn/core-user-settings-server-internal';
import type { I18nServiceSetup } from '@kbn/core-i18n-server';
import type { InternalI18nServicePreboot } from '@kbn/core-i18n-server-internal';
import type { InternalFeatureFlagsSetup } from '@kbn/core-feature-flags-server-internal';
import type { FeatureFlagsStart } from '@kbn/core-feature-flags-server';

/** @internal */
export interface RenderingMetadata {
  hardenPrototypes: ICspConfig['strict'];
  strictCsp: ICspConfig['strict'];
  uiPublicUrl: string;
  bootstrapScriptUrl: string;
  locale: string;
  themeVersion: ThemeVersion;
  darkMode: DarkModeValue;
  stylesheetPaths: string[];
  scriptPaths: string[];
  injectedMetadata: InjectedMetadata;
  customBranding: CustomBranding;
}

/** @internal */
export interface RenderingPrebootDeps {
  http: InternalHttpServicePreboot;
  uiPlugins: UiPlugins;
  i18n: InternalI18nServicePreboot;
}

/** @internal */
export interface RenderingSetupDeps {
  elasticsearch: InternalElasticsearchServiceSetup;
  featureFlags: InternalFeatureFlagsSetup;
  http: InternalHttpServiceSetup;
  status: InternalStatusServiceSetup;
  uiPlugins: UiPlugins;
  customBranding: InternalCustomBrandingSetup;
  userSettings: InternalUserSettingsServiceSetup;
  i18n: I18nServiceSetup;
}

/** @internal */
export interface RenderingStartDeps {
  featureFlags: FeatureFlagsStart;
}

/** @internal */
export interface IRenderOptions {
  /**
   * Set whether the page is anonymous, which determines what plugins are enabled and whether to output user settings in the page metadata.
   * `false` by default.
   */
  isAnonymousPage?: boolean;

  /**
   * @internal
   * This is only used for integration tests that allow us to verify which config keys are exposed to the browser.
   */
  includeExposedConfigKeys?: boolean;
}

/** @internal */
export interface InternalRenderingServiceSetup {
  /**
   * Generate a `KibanaResponse` which renders an HTML page bootstrapped
   * with the `core` bundle or the ID of another specified legacy bundle.
   *
   * @example
   * ```ts
   * const html = await rendering.render(request, uiSettings);
   * ```
   */
  render(
    request: KibanaRequest,
    uiSettings: {
      client: IUiSettingsClient;
      globalClient: IUiSettingsClient;
    },
    options?: IRenderOptions
  ): Promise<string>;
}

/** @internal */
export type InternalRenderingServicePreboot = InternalRenderingServiceSetup;
