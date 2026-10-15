/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as t from 'io-ts';

/** Schemas profiling data can be stored in, matching the Elasticsearch profiling APIs `schema` values. */
export enum ProfilingSchema {
  ECS = 'ecs',
  OTEL = 'otel',
}

export const profilingSchemaRt = t.union([
  t.literal(ProfilingSchema.ECS),
  t.literal(ProfilingSchema.OTEL),
]);

export const DEFAULT_PROFILING_SCHEMA = ProfilingSchema.OTEL;

// Only events are listed: they are the only profiling indices Kibana queries directly. Stacktraces,
// stackframes and executables are resolved by the Elasticsearch profiling APIs from the `schema` value.
export const PROFILING_EVENTS_INDEX_BY_SCHEMA: Readonly<Record<ProfilingSchema, string>> = {
  [ProfilingSchema.ECS]: 'profiling-events-all',
  [ProfilingSchema.OTEL]: 'profiling-events-all.otel-*',
};

export interface ProfilingSchemasAvailability {
  schemas: ProfilingSchema[];
}
