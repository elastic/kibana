/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';

const eventTypeSchema = z.union([
  z.literal('annotation'),
  z.literal('alert'),
  z.literal('error_rate'),
  z.literal('latency'),
  z.literal('anomaly'),
]);

const annotationEventSchema = z.object({
  eventType: z.literal('annotation'),
  annotationType: z.string().optional(),
});

const alertStatusSchema = z.union([
  z.literal('active'),
  z.literal('flapping'),
  z.literal('recovered'),
  z.literal('untracked'),
]);

const alertEventSchema = z.object({
  eventType: z.literal('alert'),
  alertStatus: alertStatusSchema,
});

const sourceSchema = z.record(z.string(), z.any());

const eventSchema = z.intersection(
  z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    timestamp: z.number(),
    eventType: eventTypeSchema,
    source: sourceSchema.optional(),
  }),
  z.discriminatedUnion('eventType', [annotationEventSchema, alertEventSchema])
);

export { eventSchema, eventTypeSchema };
