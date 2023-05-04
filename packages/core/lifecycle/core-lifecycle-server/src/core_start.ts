/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AnalyticsServiceStart } from '@kbn/core-analytics-server';
import { CapabilitiesStart } from '@kbn/core-capabilities-server';
import { DocLinksServiceStart } from '@kbn/core-doc-links-server';
import { ElasticsearchServiceStart } from '@kbn/core-elasticsearch-server';
import { ExecutionContextStart } from '@kbn/core-execution-context-server';
import { HttpServiceStart } from '@kbn/core-http-server';
import { MetricsServiceStart } from '@kbn/core-metrics-server';
import { SavedObjectsServiceStart } from '@kbn/core-saved-objects-server';
import { UiSettingsServiceStart } from '@kbn/core-ui-settings-server';
import { CoreUsageDataStart } from '@kbn/core-usage-data-server';
import { CustomBrandingStart } from '@kbn/core-custom-branding-server';

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
}
