/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { AnalyticsServiceStart } from '@kbn/core-analytics-server';
import type { CapabilitiesStart } from '@kbn/core-capabilities-server';
import type { DocLinksServiceStart } from '@kbn/core-doc-links-server';
import type { ElasticsearchServiceStart } from '@kbn/core-elasticsearch-server';
import type { ExecutionContextStart } from '@kbn/core-execution-context-server';
import type { HttpServiceStart } from '@kbn/core-http-server';
import type { MetricsServiceStart } from '@kbn/core-metrics-server';
import type { SavedObjectsServiceStart } from '@kbn/core-saved-objects-server';
import type { UiSettingsServiceStart } from '@kbn/core-ui-settings-server';
import type { CoreUsageDataStart } from '@kbn/core-usage-data-server';
import type { CustomBrandingStart } from '@kbn/core-custom-branding-server';
import type { PluginsServiceStart } from '@kbn/core-plugins-contracts-server';
import type { SecurityServiceStart } from '@kbn/core-security-server';

/**
 * Context passed to the plugins `start` method.
 *
 * @public
 */
export interface CoreStart {
  /** {@link AnalyticsServiceStart} */
  analytics: AnalyticsServiceStart;
  /** {@link CapabilitiesStart} */
  capabilities: CapabilitiesStart;
  /** {@link CustomBrandingStart} */
  customBranding: CustomBrandingStart;
  /** {@link DocLinksServiceStart} */
  docLinks: DocLinksServiceStart;
  /** {@link ElasticsearchServiceStart} */
  elasticsearch: ElasticsearchServiceStart;
  /** {@link ExecutionContextStart} */
  executionContext: ExecutionContextStart;
  /** {@link HttpServiceStart} */
  http: HttpServiceStart;
  /** {@link MetricsServiceStart} */
  metrics: MetricsServiceStart;
  /** {@link SavedObjectsServiceStart} */
  savedObjects: SavedObjectsServiceStart;
  /** {@link UiSettingsServiceStart} */
  uiSettings: UiSettingsServiceStart;
  /** @internal {@link CoreUsageDataStart} */
  coreUsageData: CoreUsageDataStart;
  /** {@link PluginsServiceStart} */
  plugins: PluginsServiceStart;
  /** {@link SecurityServiceStart} */
  security: SecurityServiceStart;
}
