/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type {
  AnalyticsServiceSetup,
  AnalyticsServiceStart,
  AnalyticsServicePreboot,
} from './src/contracts';

export type {
  AnalyticsClient,
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
  ContextProviderName,
  // Types for the registerEventType API
  EventTypeOpts,
  // Events
  Event,
  EventContext,
  EventType,
  TelemetryCounter,
  TelemetryCounterType,
  // Schema
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
  // Shippers
  IShipper,
} from '@elastic/ebt/client';
