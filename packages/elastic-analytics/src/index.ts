/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  AnalyticsClientInitContext,
  IAnalyticsClient as AnalyticsClient,
} from './analytics_client';
import { AnalyticsClient as AnalyticsClientClass } from './analytics_client';

/**
 * Creates an {@link AnalyticsClient}.
 * @param initContext The initial context to create the client {@link AnalyticsClientInitContext}
 */
export function createAnalytics(initContext: AnalyticsClientInitContext): AnalyticsClient {
  return new AnalyticsClientClass(initContext);
}

export type {
  IAnalyticsClient as AnalyticsClient,
  // Types for the constructor
  AnalyticsClientInitContext,
  // Types for the registerShipper API
  ShipperClassConstructor,
  RegisterShipperOpts,
  // Types for the optIn API
  OptInConfig,
  OptInConfigPerType,
  ShipperName,
  // Types for the registerContextProvider API
  ContextProviderOpts,
  // Types for the registerEventType API
  EventTypeOpts,
} from './analytics_client';

export type { Event, EventContext, EventType, TelemetryCounter } from './events';
export { TelemetryCounterType } from './events';

export type {
  RootSchema,
  SchemaObject,
  SchemaArray,
  SchemaChildValue,
  SchemaMeta,
  SchemaValue,
  SchemaMetaOptional,
  PossibleSchemaTypes,
  AllowedSchemaBooleanTypes,
  AllowedSchemaNumberTypes,
  AllowedSchemaStringTypes,
  AllowedSchemaTypes,
} from './schema';

export type {
  IShipper,
  ElasticV3ShipperOptions,
  FullStorySnippetConfig,
  FullStoryShipperConfig,
} from './shippers';
export { ElasticV3Shipper, FullStoryShipper } from './shippers';
