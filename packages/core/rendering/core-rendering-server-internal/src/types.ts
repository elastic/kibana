/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { ThemeVersion } from '@kbn/ui-shared-deps-npm';
import type { InjectedMetadata } from '@kbn/core-injected-metadata-common-internal';
import type { KibanaRequest, ICspConfig } from '@kbn/core-http-server';
import type {
  InternalHttpServicePreboot,
  InternalHttpServiceSetup,
} from '@kbn/core-http-server-internal';
import type { InternalElasticsearchServiceSetup } from '@kbn/core-elasticsearch-server-internal';
import type { InternalStatusServiceSetup } from '@kbn/core-status-server-internal';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-server';
import type { UiPlugins } from '@kbn/core-plugins-base-server-internal';
import type { InternalCustomBrandingSetup } from '@kbn/core-custom-branding-server-internal';
import type { CustomBranding } from '@kbn/core-custom-branding-common';

/** @internal */
export interface RenderingMetadata {
  strictCsp: ICspConfig['strict'];
  uiPublicUrl: string;
  bootstrapScriptUrl: string;
  i18n: typeof i18n.translate;
  locale: string;
  darkMode: boolean;
  themeVersion: ThemeVersion;
  stylesheetPaths: string[];
  injectedMetadata: InjectedMetadata;
  customBranding: CustomBranding;
}

/** @internal */
export interface RenderingPrebootDeps {
  http: InternalHttpServicePreboot;
  uiPlugins: UiPlugins;
}

/** @internal */
export interface RenderingSetupDeps {
  elasticsearch: InternalElasticsearchServiceSetup;
  http: InternalHttpServiceSetup;
  status: InternalStatusServiceSetup;
  uiPlugins: UiPlugins;
  customBranding: InternalCustomBrandingSetup;
}

/** @internal */
export interface IRenderOptions {
  /**
   * Set whether the page is anonymous, which determines what plugins are enabled and whether to output user settings in the page metadata.
   * `false` by default.
   */
  isAnonymousPage?: boolean;

  /**
   * Inject custom vars into the page metadata.
   * @deprecated for legacy use only. Can be removed when https://github.com/elastic/kibana/issues/127733 is done.
   * @internal
   */
  vars?: Record<string, any>;

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
