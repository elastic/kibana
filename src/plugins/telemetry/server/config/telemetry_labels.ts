/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema, TypeOf } from '@kbn/config-schema';

/**
 * Labels to enrich the context of the telemetry generated.
 * When adding new keys, bear in mind that this info is exposed
 * to the browser **even to unauthenticated pages**.
 */
export const labelsSchema = schema.object(
  {
    branch: schema.maybe(schema.string()),
    ciBuildJobId: schema.maybe(schema.string()),
    ciBuildId: schema.maybe(schema.string()),
    ciBuildNumber: schema.maybe(schema.number()),
    ftrConfig: schema.maybe(schema.string()),
    gitRev: schema.maybe(schema.string()),
    isPr: schema.maybe(schema.boolean()),
    prId: schema.maybe(schema.number()),
    journeyName: schema.maybe(schema.string()),
    testBuildId: schema.maybe(schema.string()),
    testJobId: schema.maybe(schema.string()),
    ciBuildName: schema.maybe(schema.string()),
  },
  { defaultValue: {} }
);

export type TelemetryConfigLabels = TypeOf<typeof labelsSchema>;
