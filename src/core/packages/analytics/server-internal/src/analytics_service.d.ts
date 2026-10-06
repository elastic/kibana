/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreContext } from '@kbn/core-base-server-internal';
import type {
  AnalyticsServiceSetup,
  AnalyticsServiceStart,
  AnalyticsServicePreboot,
} from '@kbn/core-analytics-server';
export declare class AnalyticsService {
  private readonly analyticsClient;
  constructor(core: CoreContext);
  preboot(): AnalyticsServicePreboot;
  setup(): AnalyticsServiceSetup;
  start(): AnalyticsServiceStart;
  stop(): Promise<void>;
  /**
   * Enriches the event with the build information.
   * @param core The core context.
   * @internal
   */
  private registerBuildInfoAnalyticsContext;
}
