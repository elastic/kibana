/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { InternalLoggingServicePreboot } from '@kbn/core-logging-server-internal';
import type { AnalyticsServicePreboot } from '@kbn/core-analytics-server';
import type { InternalPrebootServicePreboot } from '@kbn/core-preboot-server-internal';
import type { InternalContextPreboot } from '@kbn/core-http-context-server-internal';
import type { InternalHttpServicePreboot } from '@kbn/core-http-server-internal';
import type { InternalElasticsearchServicePreboot } from '@kbn/core-elasticsearch-server-internal';
import type { InternalUiSettingsServicePreboot } from '@kbn/core-ui-settings-server-internal';
import type { InternalHttpResourcesPreboot } from '@kbn/core-http-resources-server-internal';

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
