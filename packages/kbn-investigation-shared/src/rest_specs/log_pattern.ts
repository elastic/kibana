/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';

const changeHistogramSchema = z.array(
  z.object({
    timestamp: z.string(),
    documentCount: z.number(),
  })
);

const changeSchema = z.object({
  type: z.string,
  timestamp: z.string,
  correlationCoefficient: z.number().optional(),
  rawChange: z.number().optional(),
});

const logPatternSchema = z.object({
  change: changeSchema,
  documentCount: z.number(),
  histogram: changeHistogramSchema,
  terms: z.string(),
});

type ChangeHistogram = z.output<typeof changeHistogramSchema>;
type Change = z.output<typeof changeSchema>;
type LogPattern = z.output<typeof logPatternSchema>;

export { changeSchema, changeHistogramSchema, logPatternSchema };
export type { Change, ChangeHistogram, LogPattern };
