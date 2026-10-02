/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { ESQLVariableType } from '@kbn/esql-types';
import type { estypes } from '@elastic/elasticsearch';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { ACTIVITY_INVESTIGATION_ATTACHMENT_TYPE } from '../agent_builder';
import { ACTIVITY_INCREASE_KINDS } from './activity_increase';

// Generous input-validation bounds, not a token budget. Nothing is truncated.
const MAX_STRING_LENGTH = 1_000_000;
const MAX_ITEMS = 10_000;
const textSchema = z.string().max(MAX_STRING_LENGTH);
const scalarSchema = z.union([textSchema, z.number()]);
const timeRangeSchema = z.object({
  from: z.iso.datetime().max(40),
  to: z.iso.datetime().max(40),
});
const jsonObjectSchema = z
  .record(textSchema, z.json())
  .refine(
    (value) => JSON.stringify(value).length <= MAX_STRING_LENGTH,
    'The filter exceeds the input size limit'
  );
// Preserve arbitrary Query DSL; validate its JSON shape, not Elasticsearch's query syntax.
const queryDslFilterSchema = z.custom<estypes.QueryDslQueryContainer>(
  (value) => jsonObjectSchema.safeParse(value).success
);
const filterSchema = z.union([queryDslFilterSchema, z.array(queryDslFilterSchema).max(MAX_ITEMS)]);

export const activityInvestigationSnapshotSchema = z
  .object({
    actor: z
      .object({
        field: textSchema.min(1),
        value: z.union([textSchema, z.number(), z.boolean(), z.null()]),
      })
      .optional(),
    scope: z.object({
      query: textSchema.min(1),
      indexPattern: textSchema,
      timeFieldName: textSchema.min(1),
      timeRange: timeRangeSchema,
      filter: filterSchema.optional(),
      params: z
        .array(
          z.union([
            scalarSchema,
            z.boolean(),
            z.null(),
            z.record(
              textSchema,
              z
                .union([
                  scalarSchema,
                  z.array(scalarSchema).max(MAX_ITEMS),
                  z.record(textSchema, scalarSchema),
                ])
                .optional()
            ),
          ])
        )
        .max(MAX_ITEMS)
        .optional(),
      variableTypes: z.record(textSchema, z.enum(ESQLVariableType)).optional(),
      timeZone: textSchema.optional(),
      projectRouting: textSchema.optional(),
    }),
    asOf: z.iso.datetime().max(40),
    // field_sum: the series is the per-bucket SUM of metricField, not a row count.
    metric: z.enum(['query_result_count', 'field_sum']),
    metricField: textSchema.min(1).optional(),
    increase: z.object({
      // Previously saved snapshots may use a duration label or the retired spike kind,
      // and have no detector score.
      kind: z.enum([...ACTIVITY_INCREASE_KINDS, 'spike', 'sustained']),
      pvalue: z.number().min(0).max(1).optional(),
      timeRange: timeRangeSchema,
      durationMs: z.number().int().positive(),
      filter: queryDslFilterSchema,
      bucketCount: z.number().int().positive(),
      baseline: z.number().nonnegative(),
      observedMean: z.number().nonnegative(),
      observedTotal: z.number().nonnegative(),
      percentageChange: z.number().nonnegative().nullable(),
      trigger: z
        .object({
          kind: z.enum(ACTIVITY_INCREASE_KINDS),
          pvalue: z.number().min(0).max(1).optional(),
          observedTotal: z.number().nonnegative(),
          percentageChange: z.number().nonnegative().nullable(),
        })
        .optional(),
      historicalComparison: z
        .object({
          timeRange: timeRangeSchema,
          observedTotal: z.number().nonnegative(),
          daysAgo: z.number().int().positive().max(42),
          score: z.number().min(0).max(1),
        })
        .optional(),
      // Present when the interval comes from B (kind historical_interval).
      history: z
        .object({
          mode: z.enum(['weekly', 'daily']),
          spacing: z.number().int().positive(),
          references: z.array(timeRangeSchema).max(64),
          expected: z.number().nonnegative(),
          replicates: z.number().int().positive(),
          version: textSchema,
        })
        .optional(),
    }),
    comparison: z.object({
      timeRange: timeRangeSchema,
      excludedTimeRange: timeRangeSchema,
      durationMs: z.number().int().positive(),
      filter: queryDslFilterSchema,
    }),
    series: z
      .object({
        startTime: z.iso.datetime().max(40),
        endTime: z.iso.datetime().max(40),
        intervalMs: z.number().int().positive(),
        counts: z.array(z.number().nonnegative()).min(1).max(MAX_ITEMS),
      })
      .optional(),
  })
  .refine(
    ({ series, increase }) =>
      Boolean(series) || increase.kind === 'contributor' || increase.kind === 'related_metric',
    'A detected total requires its bucket series'
  );

export type ActivityInvestigationSnapshot = z.infer<typeof activityInvestigationSnapshotSchema>;
export type ActivityInvestigationAttachment = Attachment<
  typeof ACTIVITY_INVESTIGATION_ATTACHMENT_TYPE,
  ActivityInvestigationSnapshot
>;
