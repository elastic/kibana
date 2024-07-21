/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// Exporting the types here as a utility only
// The recommended way of using this library is to import from the subdirectories /client, /shippers/*
// The reason is to avoid leaking server-side code to the browser, and vice-versa
export type {
  AnalyticsClient,
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
} from './client';
export type { ElasticV3ShipperOptions } from './shippers/elastic_v3/common';
export type { ElasticV3BrowserShipper } from './shippers/elastic_v3/browser';
export type { ElasticV3ServerShipper } from './shippers/elastic_v3/server';
export type {
  FullStoryShipperConfig,
  FullStoryShipper,
  FullStorySnippetConfig,
} from './shippers/fullstory';
