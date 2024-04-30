/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { AnalyticsServiceSetup } from '@kbn/core-analytics-server';
import type { CapabilitiesSetup } from '@kbn/core-capabilities-server';
import type { DocLinksServiceSetup } from '@kbn/core-doc-links-server';
import type { I18nServiceSetup } from '@kbn/core-i18n-server';
import type { InternalElasticsearchServiceSetup } from '@kbn/core-elasticsearch-server-internal';
import type { InternalEnvironmentServiceSetup } from '@kbn/core-environment-server-internal';
import type { InternalExecutionContextSetup } from '@kbn/core-execution-context-server-internal';
import type { InternalContextSetup } from '@kbn/core-http-context-server-internal';
import type { InternalDeprecationsServiceSetup } from '@kbn/core-deprecations-server-internal';
import type { InternalHttpResourcesSetup } from '@kbn/core-http-resources-server-internal';
import type { InternalHttpServiceSetup } from '@kbn/core-http-server-internal';
import type { InternalLoggingServiceSetup } from '@kbn/core-logging-server-internal';
import type { InternalMetricsServiceSetup } from '@kbn/core-metrics-server-internal';
import type { InternalRenderingServiceSetup } from '@kbn/core-rendering-server-internal';
import type { InternalSavedObjectsServiceSetup } from '@kbn/core-saved-objects-server-internal';
import type { InternalStatusServiceSetup } from '@kbn/core-status-server-internal';
import type { InternalUiSettingsServiceSetup } from '@kbn/core-ui-settings-server-internal';
import type { InternalCoreUsageDataSetup } from '@kbn/core-usage-data-base-server-internal';
import type { InternalCustomBrandingSetup } from '@kbn/core-custom-branding-server-internal';
import type { InternalUserSettingsServiceSetup } from '@kbn/core-user-settings-server-internal';
import type { InternalSecurityServiceSetup } from '@kbn/core-security-server-internal';
import type { InternalUserProfileServiceSetup } from '@kbn/core-user-profile-server-internal';

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
  customBranding: InternalCustomBrandingSetup;
  userSettings: InternalUserSettingsServiceSetup;
  security: InternalSecurityServiceSetup;
  userProfile: InternalUserProfileServiceSetup;
}
