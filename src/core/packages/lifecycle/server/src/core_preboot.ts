/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AnalyticsServicePreboot } from '@kbn/core-analytics-server';
import type { HttpServicePreboot } from '@kbn/core-http-server';
import type { PrebootServicePreboot } from '@kbn/core-preboot-server';
import type { ElasticsearchServicePreboot } from '@kbn/core-elasticsearch-server';
import type { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';

/**
 * Context passed to the `setup` method of `preboot` plugins.
 * @public
 */
export interface CorePreboot {
  /** {@link AnalyticsServicePreboot} */
  analytics: AnalyticsServicePreboot;
  /** {@link ElasticsearchServicePreboot} */
  elasticsearch: ElasticsearchServicePreboot;
  /** {@link HttpServicePreboot} */
  http: HttpServicePreboot<RequestHandlerContext>;
  /** {@link PrebootServicePreboot} */
  preboot: PrebootServicePreboot;
}
