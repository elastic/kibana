/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as t from 'io-ts';

const eventTypeSchema = t.union([
  t.literal('annotation'),
  t.literal('alert'),
  t.literal('error_rate'),
  t.literal('latency'),
  t.literal('anomaly'),
]);

const annotationEventSchema = t.type({
  type: t.string,
  end: t.union([t.string, t.undefined]),
});

const alertStatusSchema = t.union([
  t.literal('active'),
  t.literal('flapping'),
  t.literal('recovered'),
  t.literal('untracked'),
]);

const alertEventSchema = t.type({
  status: alertStatusSchema,
});

const eventSchema = t.intersection([
  t.type({
    id: t.string,
    title: t.string,
    description: t.string,
    timestamp: t.number,
    type: eventTypeSchema,
  }),
  t.partial({
    details: t.union([annotationEventSchema, alertEventSchema]),
    source: t.record(t.string, t.any),
  }),
]);

export { eventSchema };
