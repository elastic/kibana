/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AnalyticsServiceSetup } from '@kbn/core-analytics-server';
import { CapabilitiesSetup } from '@kbn/core-capabilities-server';
import { DeprecationsServiceSetup } from '@kbn/core-deprecations-server';
import { DocLinksServiceSetup } from '@kbn/core-doc-links-server';
import { ElasticsearchServiceSetup } from '@kbn/core-elasticsearch-server';
import { ExecutionContextSetup } from '@kbn/core-execution-context-server';
import { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import { HttpResources } from '@kbn/core-http-resources-server';
import { HttpServiceSetup } from '@kbn/core-http-server';
import { I18nServiceSetup } from '@kbn/core-i18n-server';
import { LoggingServiceSetup } from '@kbn/core-logging-server';
import { MetricsServiceSetup } from '@kbn/core-metrics-server';
import { SavedObjectsServiceSetup } from '@kbn/core-saved-objects-server';
import { StatusServiceSetup } from '@kbn/core-status-server';
import { UiSettingsServiceSetup } from '@kbn/core-ui-settings-server';
import { CoreUsageDataSetup } from '@kbn/core-usage-data-server';
import { CustomBrandingSetup } from '@kbn/core-custom-branding-server';
import { CoreStart } from './core_start';

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
  /** {@link DeprecationsServiceSetup} */
  deprecations: DeprecationsServiceSetup;
  /** {@link StartServicesAccessor} */
  getStartServices: StartServicesAccessor<TPluginsStart, TStart>;
  /** @internal {@link CoreUsageDataSetup} */
  coreUsageData: CoreUsageDataSetup;
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
