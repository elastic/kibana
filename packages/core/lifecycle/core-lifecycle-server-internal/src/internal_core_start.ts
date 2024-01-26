/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { AnalyticsServiceStart } from '@kbn/core-analytics-server';
import type { CapabilitiesStart } from '@kbn/core-capabilities-server';
import type { InternalDeprecationsServiceStart } from '@kbn/core-deprecations-server-internal';
import type { DocLinksServiceStart } from '@kbn/core-doc-links-server';
import type { InternalElasticsearchServiceStart } from '@kbn/core-elasticsearch-server-internal';
import type { InternalExecutionContextStart } from '@kbn/core-execution-context-server-internal';
import type { InternalHttpServiceStart } from '@kbn/core-http-server-internal';
import type { InternalMetricsServiceStart } from '@kbn/core-metrics-server-internal';
import type { InternalSavedObjectsServiceStart } from '@kbn/core-saved-objects-server-internal';
import type { InternalUiSettingsServiceStart } from '@kbn/core-ui-settings-server-internal';
import type { CoreUsageDataStart } from '@kbn/core-usage-data-server';
import type { CustomBrandingStart } from '@kbn/core-custom-branding-server';

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
  customBranding: CustomBrandingStart;
}
