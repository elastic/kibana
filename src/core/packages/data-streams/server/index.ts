/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type { DataStreamsSetup, DataStreamsStart } from './src/contracts';

/** Re-export some of these types from here */
export type {
  IDataStreamClient,
  DataStreamDefinition,
  BaseSearchRuntimeMappings,
  BooleanMapping,
  ClientHelpers,
  DataStreamClient,
  DataStreamClientArgs,
  DateMapping,
  DateNanosMapping,
  FlattenedMapping,
  IDataStreamClientIndexRequest,
  IntegerMapping,
  KeywordMapping,
  LongMapping,
  ShortMapping,
  Strict,
  TextMapping,
  SearchRequestImproved,
} from '@kbn/data-streams';
export { mappings } from '@kbn/data-streams';
