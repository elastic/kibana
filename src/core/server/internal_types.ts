/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DocLinksServiceStart, DocLinksServiceSetup } from '@kbn/core-doc-links-server';
import {
  InternalLoggingServicePreboot,
  InternalLoggingServiceSetup,
} from '@kbn/core-logging-server-internal';
import type {
  AnalyticsServicePreboot,
  AnalyticsServiceSetup,
  AnalyticsServiceStart,
} from '@kbn/core-analytics-server';
import type { InternalEnvironmentServiceSetup } from '@kbn/core-environment-server-internal';
import type {
  InternalExecutionContextSetup,
  InternalExecutionContextStart,
} from '@kbn/core-execution-context-server-internal';
import type { InternalPrebootServicePreboot } from '@kbn/core-preboot-server-internal';
import type {
  InternalContextPreboot,
  InternalContextSetup,
} from '@kbn/core-http-context-server-internal';
import type {
  InternalHttpServicePreboot,
  InternalHttpServiceSetup,
  InternalHttpServiceStart,
} from '@kbn/core-http-server-internal';
import type {
  InternalMetricsServiceSetup,
  InternalMetricsServiceStart,
} from '@kbn/core-metrics-server-internal';
import {
  InternalElasticsearchServicePreboot,
  InternalElasticsearchServiceSetup,
  InternalElasticsearchServiceStart,
} from '@kbn/core-elasticsearch-server-internal';
import type { CapabilitiesSetup, CapabilitiesStart } from '@kbn/core-capabilities-server';
import {
  InternalSavedObjectsServiceSetup,
  InternalSavedObjectsServiceStart,
} from '@kbn/core-saved-objects-server-internal';
import {
  InternalDeprecationsServiceSetup,
  InternalDeprecationsServiceStart,
} from '@kbn/core-deprecations-server-internal';
import type { CoreUsageDataStart } from '@kbn/core-usage-data-server';
import type { InternalCoreUsageDataSetup } from '@kbn/core-usage-data-base-server-internal';
import type { I18nServiceSetup } from '@kbn/core-i18n-server';
import type { InternalStatusServiceSetup } from '@kbn/core-status-server-internal';
import type {
  InternalUiSettingsServicePreboot,
  InternalUiSettingsServiceSetup,
  InternalUiSettingsServiceStart,
} from '@kbn/core-ui-settings-server-internal';
import type { InternalRenderingServiceSetup } from '@kbn/core-rendering-server-internal';
import type {
  InternalHttpResourcesPreboot,
  InternalHttpResourcesSetup,
} from '@kbn/core-http-resources-server-internal';

/** @internal */
export interface InternalCorePreboot {
  analytics: AnalyticsServicePreboot;
  context: InternalContextPreboot;
  http: InternalHttpServicePreboot;
  elasticsearch: InternalElasticsearchServicePreboot;
  uiSettings: InternalUiSettingsServicePreboot;
  httpResources: InternalHttpResourcesPreboot;
  logging: InternalLoggingServicePreboot;
  preboot: InternalPrebootServicePreboot;
}

/** @internal */
export interface InternalCoreSetup {
  analytics: AnalyticsServiceSetup;
  capabilities: CapabilitiesSetup;
  context: InternalContextSetup;
  docLinks: DocLinksServiceSetup;
  http: InternalHttpServiceSetup;
  elasticsearch: InternalElasticsearchServiceSetup;
  executionContext: InternalExecutionContextSetup;
  i18n: I18nServiceSetup;
  savedObjects: InternalSavedObjectsServiceSetup;
  status: InternalStatusServiceSetup;
  uiSettings: InternalUiSettingsServiceSetup;
  environment: InternalEnvironmentServiceSetup;
  rendering: InternalRenderingServiceSetup;
  httpResources: InternalHttpResourcesSetup;
  logging: InternalLoggingServiceSetup;
  metrics: InternalMetricsServiceSetup;
  deprecations: InternalDeprecationsServiceSetup;
  coreUsageData: InternalCoreUsageDataSetup;
}

/**
 * @internal
 */
export interface InternalCoreStart {
  analytics: AnalyticsServiceStart;
  capabilities: CapabilitiesStart;
  elasticsearch: InternalElasticsearchServiceStart;
  docLinks: DocLinksServiceStart;
  http: InternalHttpServiceStart;
  metrics: InternalMetricsServiceStart;
  savedObjects: InternalSavedObjectsServiceStart;
  uiSettings: InternalUiSettingsServiceStart;
  coreUsageData: CoreUsageDataStart;
  executionContext: InternalExecutionContextStart;
  deprecations: InternalDeprecationsServiceStart;
}
