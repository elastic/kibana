/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';

const logPatternSourceSchema = z.object({
  index: z.string(),
  entity: z.string().optional(),
  serviceName: z.string().optional(),
  serviceEnvironment: z.string().optional(),
  environment: z.string().optional(),
  containerId: z.string().optional(),
  hostName: z.string().optional(),
  dependencies: z.array(z.string()).optional().default([]),
});

const changeHistogramSchema = z.array(
  z.object({
    timestamp: z.string(),
    documentCount: z.number(),
  })
);

const changeSchema = z.object({
  type: z.string(),
  pValue: z.number().optional(),
  timestamp: z.string().optional(),
  correlationCoefficient: z.number().optional(),
  rawChange: z.string().optional(),
});

const logPatternSchema = z.object({
  change: changeSchema,
  documentCount: z.number(),
  histogram: changeHistogramSchema,
  terms: z.string(),
  source: z.string().optional(),
});

const entityLogPatternsSchema = z.object({
  index: z.string(),
  impactingPatterns: z.array(logPatternSchema),
});

type ChangeHistogram = z.output<typeof changeHistogramSchema>;
type Change = z.output<typeof changeSchema>;
type LogPattern = z.output<typeof logPatternSchema>;
type LogPatternSource = z.output<typeof logPatternSourceSchema>;
type EntityLogPatterns = z.output<typeof entityLogPatternsSchema>;

export {
  changeSchema,
  changeHistogramSchema,
  logPatternSchema,
  logPatternSourceSchema,
  entityLogPatternsSchema,
};
export type { Change, ChangeHistogram, LogPattern, LogPatternSource, EntityLogPatterns };
