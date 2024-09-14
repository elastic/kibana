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
  type: z.union([z.string(), z.undefined()]),
  end: z.union([z.string(), z.undefined()]),
});

const alertStatusSchema = z.union([
  z.literal('active'),
  z.literal('flapping'),
  z.literal('recovered'),
  z.literal('untracked'),
]);

const alertEventSchema = z.object({
  status: alertStatusSchema,
});

const eventSchema = z.intersection(
  z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    timestamp: z.number(),
    type: eventTypeSchema,
  }),
  z
    .object({
      details: z.union([annotationEventSchema, alertEventSchema]),
      source: z.record(z.string(), z.any()),
    })
    .partial()
);

export { eventSchema };
