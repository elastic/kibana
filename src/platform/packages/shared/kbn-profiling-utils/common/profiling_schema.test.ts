/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PROFILING_EVENTS_INDEX_BY_SCHEMA, ProfilingSchema } from './profiling_schema';

describe('PROFILING_EVENTS_INDEX_BY_SCHEMA', () => {
  // The values are pinned on purpose. The data streams of both schemas share the `profiling-events`
  // prefix, so a broad value like `profiling-events*` would match the data of both schemas at once
  // and report data from one schema as belonging to the other.
  test('targets only the events of each schema', () => {
    expect(PROFILING_EVENTS_INDEX_BY_SCHEMA).toStrictEqual({
      [ProfilingSchema.ECS]: 'profiling-events-all',
      [ProfilingSchema.OTEL]: 'profiling-events-all.otel-*',
    });
  });
});
