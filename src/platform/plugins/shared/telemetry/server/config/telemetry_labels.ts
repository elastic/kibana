/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { offeringBasedSchema, schema, TypeOf } from '@kbn/config-schema';

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
    environment: schema.maybe(schema.string()),
    ftrConfig: schema.maybe(schema.string()),
    gitRev: schema.maybe(schema.string()),
    isPr: schema.maybe(schema.boolean()),
    prId: schema.maybe(schema.number()),
    journeyName: schema.maybe(schema.string()),
    testBuildId: schema.maybe(schema.string()),
    testJobId: schema.maybe(schema.string()),
    ciBuildName: schema.maybe(schema.string()),
    performancePhase: schema.maybe(schema.string()),
    /**
     * The serverless project type.
     * Flagging it as maybe because these settings should never affect how Kibana runs.
     */
    serverless: offeringBasedSchema({ serverless: schema.maybe(schema.string()) }),
  },
  { defaultValue: {} }
);

export type TelemetryConfigLabels = TypeOf<typeof labelsSchema>;
