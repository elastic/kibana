/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { AnalyticsService } from './analytics_service';
export type {
  AnalyticsServicePreboot,
  AnalyticsServiceSetup,
  AnalyticsServiceStart,
} from './analytics_service';

export type {
  AnalyticsClient,
  Event,
  EventContext,
  EventType,
  EventTypeOpts,
  IShipper,
  ShipperClassConstructor,
  OptInConfig,
  ContextProviderOpts,
  TelemetryCounter,
} from '@elastic/analytics';

export { TelemetryCounterType } from '@elastic/analytics';
