/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { StepCategory } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '../../step_registry/types';

export const DataAggregateStepTypeId = 'data.aggregate' as const;

const MetricSchema = z.object({
  name: z.string().describe(
    i18n.translate('workflowsExtensions.dataAggregateStep.schema.metric.name', {
      defaultMessage: 'Name of the metric in the output.',
    })
  ),
  operation: z.enum(['count', 'sum', 'avg', 'min', 'max']).describe(
    i18n.translate('workflowsExtensions.dataAggregateStep.schema.metric.operation', {
      defaultMessage:
        'Aggregation operation. count is the number of items in each group and does not need a field; sum, avg, min, and max do (min/max work on numbers and dates).',
    })
  ),
  field: z
    .string()
    .optional()
    .describe(
      i18n.translate('workflowsExtensions.dataAggregateStep.schema.metric.field', {
        defaultMessage: 'Field to aggregate. Required for sum, avg, min, and max.',
      })
    ),
});

const BucketRangeSchema = z.object({
  from: z
    .number()
    .optional()
    .describe(
      i18n.translate('workflowsExtensions.dataAggregateStep.schema.bucketRange.from', {
        defaultMessage: 'Range start (inclusive). Omit for an open-ended lower bound.',
      })
    ),
  to: z
    .number()
    .optional()
    .describe(
      i18n.translate('workflowsExtensions.dataAggregateStep.schema.bucketRange.to', {
        defaultMessage: 'Range end (exclusive). Omit for an open-ended upper bound.',
      })
    ),
  label: z
    .string()
    .optional()
    .describe(
      i18n.translate('workflowsExtensions.dataAggregateStep.schema.bucketRange.label', {
        defaultMessage: 'Label for this range in the output.',
      })
    ),
});

const BucketConfigSchema = z.object({
  field: z.string().describe(
    i18n.translate('workflowsExtensions.dataAggregateStep.schema.buckets.field', {
      defaultMessage: 'Numeric field to bucket.',
    })
  ),
  ranges: z
    .array(BucketRangeSchema)
    .min(1)
    .describe(
      i18n.translate('workflowsExtensions.dataAggregateStep.schema.buckets.ranges', {
        defaultMessage:
          'Bucket ranges. Each range has from, to, and label; from or to can be omitted.',
      })
    ),
});

export const ConfigSchema = z.object({
  items: z.unknown().describe(
    i18n.translate('workflowsExtensions.dataAggregateStep.schema.items', {
      defaultMessage: 'Source array.',
    })
  ),
});

export const InputSchema = z.object({
  group_by: z
    .array(z.string())
    .min(1)
    .describe(
      i18n.translate('workflowsExtensions.dataAggregateStep.schema.groupBy', {
        defaultMessage: 'Fields to group by.',
      })
    ),
  metrics: z
    .array(MetricSchema)
    .min(1)
    .describe(
      i18n.translate('workflowsExtensions.dataAggregateStep.schema.metrics', {
        defaultMessage: 'Array of { name, operation, field? } metrics.',
      })
    ),
  buckets: BucketConfigSchema.optional().describe(
    i18n.translate('workflowsExtensions.dataAggregateStep.schema.buckets', {
      defaultMessage: 'Optional numeric range bucketing.',
    })
  ),
  order_by: z
    .string()
    .optional()
    .describe(
      i18n.translate('workflowsExtensions.dataAggregateStep.schema.orderBy', {
        defaultMessage: 'Metric name to order by.',
      })
    ),
  order: z
    .enum(['asc', 'desc'])
    .optional()
    .default('asc')
    .describe(
      i18n.translate('workflowsExtensions.dataAggregateStep.schema.order', {
        defaultMessage: 'asc or desc.',
      })
    ),
  limit: z
    .number()
    .positive()
    .optional()
    .describe(
      i18n.translate('workflowsExtensions.dataAggregateStep.schema.limit', {
        defaultMessage: 'Max number of buckets to return.',
      })
    ),
});

export const OutputSchema = z.array(z.record(z.string(), z.unknown()));

export type DataAggregateStepConfigSchema = typeof ConfigSchema;
export type DataAggregateStepInputSchema = typeof InputSchema;
export type DataAggregateStepOutputSchema = typeof OutputSchema;

export const dataAggregateStepCommonDefinition: CommonStepDefinition<
  DataAggregateStepInputSchema,
  DataAggregateStepOutputSchema,
  DataAggregateStepConfigSchema
> = {
  id: DataAggregateStepTypeId,
  category: StepCategory.Data,
  label: i18n.translate('workflowsExtensions.dataAggregateStep.label', {
    defaultMessage: 'Aggregate Collection',
  }),
  description: i18n.translate('workflowsExtensions.dataAggregateStep.description', {
    defaultMessage: 'Group records and compute metrics like count, sum, avg, min, and max',
  }),
  documentation: {
    details: i18n.translate('workflowsExtensions.dataAggregateStep.documentation.details', {
      defaultMessage:
        'Group a collection by one or more keys and compute metrics per group. Supported operations: count (no field needed), sum, avg, min, and max (min/max work on numbers and dates).',
    }),
    examples: [
      `## Basic usage
\`\`\`yaml
- name: summarize-by-status
  type: data.aggregate
  items: "\${{ steps.fetch_tickets.output }}"
  with:
    group_by:
      - "status"
    metrics:
      - name: "count"
        operation: "count"
      - name: "avg_age"
        operation: "avg"
        field: "age_days"
      - name: "max_severity"
        operation: "max"
        field: "severity"
\`\`\``,
      `## With ordering and limit
\`\`\`yaml
- name: top-categories
  type: data.aggregate
  items: "\${{ steps.fetch_products.output }}"
  with:
    group_by:
      - "category"
    metrics:
      - name: "count"
        operation: "count"
      - name: "total_revenue"
        operation: "sum"
        field: "price"
    order_by: "total_revenue"
    order: "desc"
    limit: 5
\`\`\``,
      `## Basic grouping
\`\`\`yaml
- name: count_by_host
  type: data.aggregate
  items: "\${{ event.alerts }}"
  with:
    group_by: ["host.name"]
    metrics:
      - name: "count"
        operation: "count"
    order: "desc"
    order_by: "count"
    limit: 10
\`\`\``,
      `## With bucketed aggregation
\`\`\`yaml
- name: age_distribution
  type: data.aggregate
  items: "\${{ steps.fetch_users.output }}"
  with:
    group_by: ["department"]
    metrics:
      - name: "count"
        operation: "count"
    order: "desc"
    buckets:
      field: "age"
      ranges:
        - to: 30
          label: "junior"
        - from: 30
          to: 50
          label: "mid"
        - from: 50
          label: "senior"
\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: ConfigSchema,
};
