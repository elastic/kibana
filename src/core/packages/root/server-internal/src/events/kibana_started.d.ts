/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AnalyticsServiceSetup, AnalyticsServiceStart } from '@kbn/core-analytics-server';
/** @internal */
export interface UptimePerStep {
  start: number;
  end: number;
}
/** @internal */
export interface UptimeSteps {
  constructor: UptimePerStep;
  preboot: UptimePerStep;
  setup: UptimePerStep;
  start: UptimePerStep;
  elasticsearch: {
    waitTime: number;
  };
  savedObjects: {
    migrationTime: number;
  };
}
export declare const registerKibanaStartedEvent: (analytics: AnalyticsServiceSetup) => void;
/**
 * Reports the new and legacy KIBANA_STARTED_EVENT.
 */
export declare const reportKibanaStartedEvent: ({
  analytics,
  uptimeSteps,
}: {
  analytics: AnalyticsServiceStart;
  uptimeSteps: UptimeSteps;
}) => void;
