/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AnalyticsServiceSetup } from '@kbn/core-analytics-server';
import type { CapabilitiesSetup } from '@kbn/core-capabilities-server';
import type { DeprecationsServiceSetup } from '@kbn/core-deprecations-server';
import type { DocLinksServiceSetup } from '@kbn/core-doc-links-server';
import type { ElasticsearchServiceSetup } from '@kbn/core-elasticsearch-server';
import type { ExecutionContextSetup } from '@kbn/core-execution-context-server';
import type { FeatureFlagsSetup } from '@kbn/core-feature-flags-server';
import type { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import type { HttpResources } from '@kbn/core-http-resources-server';
import type { HttpServiceSetup } from '@kbn/core-http-server';
import type { I18nServiceSetup } from '@kbn/core-i18n-server';
import type { LoggingServiceSetup } from '@kbn/core-logging-server';
import type { MetricsServiceSetup } from '@kbn/core-metrics-server';
import type { SavedObjectsServiceSetup } from '@kbn/core-saved-objects-server';
import type { StatusServiceSetup } from '@kbn/core-status-server';
import type { UiSettingsServiceSetup } from '@kbn/core-ui-settings-server';
import type { CoreUsageDataSetup } from '@kbn/core-usage-data-server';
import type { CustomBrandingSetup } from '@kbn/core-custom-branding-server';
import type { UserSettingsServiceSetup } from '@kbn/core-user-settings-server';
import type { PluginsServiceSetup } from '@kbn/core-plugins-contracts-server';
import type { SecurityServiceSetup } from '@kbn/core-security-server';
import type { UserProfileServiceSetup } from '@kbn/core-user-profile-server';
import type { CoreStart } from './core_start';

/**
 * Context passed to the `setup` method of `standard` plugins.
 *
 * @typeParam TPluginsStart - the type of the consuming plugin's start dependencies. Should be the same
 *                            as the consuming {@link Plugin}'s `TPluginsStart` type. Used by `getStartServices`.
 * @typeParam TStart - the type of the consuming plugin's start contract. Should be the same as the
 *                     consuming {@link Plugin}'s `TStart` type. Used by `getStartServices`.
 * @public
 */
export interface CoreSetup<TPluginsStart extends object = object, TStart = unknown> {
  /** {@link AnalyticsServiceSetup} */
  analytics: AnalyticsServiceSetup;
  /** {@link CapabilitiesSetup} */
  capabilities: CapabilitiesSetup;
  /** {@link CustomBrandingSetup} */
  customBranding: CustomBrandingSetup;
  /** {@link DocLinksServiceSetup} */
  docLinks: DocLinksServiceSetup;
  /** {@link ElasticsearchServiceSetup} */
  elasticsearch: ElasticsearchServiceSetup;
  /** {@link ExecutionContextSetup} */
  executionContext: ExecutionContextSetup;
  /** {@link FeatureFlagsSetup} */
  featureFlags: FeatureFlagsSetup;
  /** {@link HttpServiceSetup} */
  http: HttpServiceSetup<RequestHandlerContext> & {
    /** {@link HttpResources} */
    resources: HttpResources;
  };
  /** {@link I18nServiceSetup} */
  i18n: I18nServiceSetup;
  /** {@link LoggingServiceSetup} */
  logging: LoggingServiceSetup;
  /** {@link MetricsServiceSetup} */
  metrics: MetricsServiceSetup;
  /** {@link SavedObjectsServiceSetup} */
  savedObjects: SavedObjectsServiceSetup;
  /** {@link StatusServiceSetup} */
  status: StatusServiceSetup;
  /** {@link UiSettingsServiceSetup} */
  uiSettings: UiSettingsServiceSetup;
  /** {@link UserSettingsServiceSetup} */
  userSettings: UserSettingsServiceSetup;
  /** {@link DeprecationsServiceSetup} */
  deprecations: DeprecationsServiceSetup;
  /** {@link StartServicesAccessor} */
  getStartServices: StartServicesAccessor<TPluginsStart, TStart>;
  /** @internal {@link CoreUsageDataSetup} */
  coreUsageData: CoreUsageDataSetup;
  /** {@link PluginsServiceSetup} */
  plugins: PluginsServiceSetup;
  /** {@link SecurityServiceSetup} */
  security: SecurityServiceSetup;
  /** {@link UserProfileServiceSetup} */
  userProfile: UserProfileServiceSetup;
}

/**
 * Allows plugins to get access to APIs available in start inside async handlers.
 * Promise will not resolve until Core and plugin dependencies have completed `start`.
 * This should only be used inside handlers registered during `setup` that will only be executed
 * after `start` lifecycle.
 *
 * @public
 */
export type StartServicesAccessor<
  TPluginsStart extends object = object,
  TStart = unknown
> = () => Promise<[CoreStart, TPluginsStart, TStart]>;
