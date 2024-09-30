/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';

const sourceSchema = z.record(z.string(), z.any());

const metricsSchema = z.object({
  failedTransactionRate: z.number().optional(),
  latency: z.number().optional(),
  throughput: z.number().optional(),
  logErrorRate: z.number().optional(),
  logRate: z.number().optional(),
});

const entitySchema = z.object({
  id: z.string(),
  definitionId: z.string(),
  definitionVersion: z.string(),
  displayName: z.string(),
  firstSeenTimestamp: z.string(),
  lastSeenTimestamp: z.string(),
  identityFields: z.array(z.string()),
  schemaVersion: z.string(),
  type: z.string(),
  metrics: metricsSchema,
});

const entityDocumentAnalysisSchema = z.object({
  total: z.number(),
  sampled: z.number(),
  fields: z.array(z.string()),
});

const entitySourcesSchema = z.object({
  index: z.string(),
  aliases: sourceSchema.optional(),
  dataStream: z.string().optional(),
  documentAnalysis: entityDocumentAnalysisSchema,
});

const entityWithSampleDocumentsSchema = z.intersection(
  entitySchema,
  z.object({
    sources: z.array(entitySourcesSchema),
  })
);

type EntityWithSampledDocuments = z.output<typeof entityWithSampleDocumentsSchema>;

export { entityWithSampleDocumentsSchema };
export type { EntityWithSampledDocuments };
