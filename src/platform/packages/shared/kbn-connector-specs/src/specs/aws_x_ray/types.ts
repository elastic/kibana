/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

// X-Ray insight IDs are UUIDs, e.g. returned by getInsightSummaries.
const INSIGHT_ID_PATTERN =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
// X-Ray trace IDs look like "1-58fb9b6b-b19c04eaa851f22a02e4b4ac"; bound the
// character set since the value flows directly into a JSON request body.
const TRACE_ID_PATTERN = /^[0-9a-zA-Z-]{1,35}$/;

const startTimeField = z
  .number()
  .int()
  .describe('Start of the time window as a Unix timestamp in seconds. Example: 1716200000.');
const endTimeField = z
  .number()
  .int()
  .describe('End of the time window as a Unix timestamp in seconds. Example: 1716203600.');
const nextTokenField = (maxLength: number) =>
  z
    .string()
    .max(maxLength)
    .optional()
    .describe('Pagination token from a previous response. Omit to fetch the first page.');
const groupArnField = z
  .string()
  .max(400)
  .optional()
  .describe(
    'ARN of the X-Ray group to scope the query to. Use getGroups to look up a group ARN. Provide either groupArn or groupName, not both.'
  );
const groupNameField = z
  .string()
  .max(32)
  .optional()
  .describe(
    'Name of the X-Ray group to scope the query to (case-sensitive). Use getGroups to look up a group name. Provide either groupArn or groupName, not both.'
  );
const traceIdField = z.string().regex(TRACE_ID_PATTERN, 'Must be a valid X-Ray trace ID.');

export const GetInsightSummariesInputSchema = lazySchema(() =>
  z
    .object({
      startTime: startTimeField.describe(
        'Start of the time frame in which insights started. Cannot be more than 30 days old. Unix timestamp in seconds.'
      ),
      endTime: endTimeField.describe(
        'End of the time frame in which insights ended. Cannot be more than 30 days old. Unix timestamp in seconds.'
      ),
      groupArn: groupArnField,
      groupName: groupNameField,
      maxResults: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of insight summaries to return (1-100).'),
      nextToken: nextTokenField(2000),
      states: z
        .array(z.enum(['ACTIVE', 'CLOSED']))
        .max(1)
        .optional()
        .describe(
          'Filter insights by state. "ACTIVE" for ongoing anomalies, "CLOSED" for resolved ones. At most one value.'
        ),
    })
    .refine((input) => Boolean(input.groupArn) || Boolean(input.groupName), {
      message: 'Provide either groupArn or groupName to identify the group to query.',
    })
);
export type GetInsightSummariesInput = z.infer<typeof GetInsightSummariesInputSchema>;

export const GetInsightInputSchema = lazySchema(() =>
  z.object({
    insightId: z
      .string()
      .regex(INSIGHT_ID_PATTERN, 'Must be a valid insight ID (UUID format).')
      .describe(
        'The insight\u2019s unique identifier, returned by getInsightSummaries. Example: "sample-insight-1"-style UUID.'
      ),
  })
);
export type GetInsightInput = z.infer<typeof GetInsightInputSchema>;

export const GetServiceGraphInputSchema = lazySchema(() =>
  z.object({
    startTime: startTimeField,
    endTime: endTimeField,
    groupArn: groupArnField,
    groupName: groupNameField,
    nextToken: nextTokenField(2000),
  })
);
export type GetServiceGraphInput = z.infer<typeof GetServiceGraphInputSchema>;

export const GetTraceSummariesInputSchema = lazySchema(() =>
  z.object({
    startTime: startTimeField,
    endTime: endTimeField,
    filterExpression: z
      .string()
      .max(2000)
      .optional()
      .describe(
        'X-Ray filter expression to narrow results, e.g. \'service("api.example.com")\' or \'annotation.account = "12345"\'. Omit to return all traces in the time window.'
      ),
    nextToken: nextTokenField(2000),
    sampling: z
      .boolean()
      .optional()
      .describe('Set to true to return summaries for only a subset of the matching traces.'),
    samplingStrategy: z
      .object({
        name: z.enum(['PartialScan', 'FixedRate']).optional().describe('Sampling strategy name.'),
        value: z.number().optional().describe('Sampling strategy value (0-1 for FixedRate).'),
      })
      .optional()
      .describe('Fine-grained sampling configuration. Only used when sampling is true.'),
    timeRangeType: z
      .enum(['TraceId', 'Event', 'Service'])
      .optional()
      .describe(
        'Which timestamp to filter on: "TraceId" (trace start time), "Event" (trace update time), or "Service" (trace segment end time). Defaults to TraceId.'
      ),
  })
);
export type GetTraceSummariesInput = z.infer<typeof GetTraceSummariesInputSchema>;

export const BatchGetTracesInputSchema = lazySchema(() =>
  z.object({
    traceIds: z
      .array(traceIdField)
      .min(1)
      .max(5)
      .describe(
        'Trace IDs to retrieve full segment detail for (1-5 IDs). Get these from getTraceSummaries.'
      ),
    nextToken: nextTokenField(2000),
  })
);
export type BatchGetTracesInput = z.infer<typeof BatchGetTracesInputSchema>;

export const GetInsightImpactGraphInputSchema = lazySchema(() =>
  z.object({
    insightId: z
      .string()
      .regex(INSIGHT_ID_PATTERN, 'Must be a valid insight ID (UUID format).')
      .describe('The insight\u2019s unique identifier, returned by getInsightSummaries.'),
    startTime: startTimeField.describe(
      'Estimated start time of the insight, in Unix seconds. Inclusive, cannot be more than 30 days old.'
    ),
    endTime: endTimeField.describe(
      'Estimated end time of the insight, in Unix seconds. Exclusive. The gap between startTime and endTime cannot exceed six hours.'
    ),
    nextToken: nextTokenField(2000),
  })
);
export type GetInsightImpactGraphInput = z.infer<typeof GetInsightImpactGraphInputSchema>;

export const GetInsightEventsInputSchema = lazySchema(() =>
  z.object({
    insightId: z
      .string()
      .regex(INSIGHT_ID_PATTERN, 'Must be a valid insight ID (UUID format).')
      .describe('The insight\u2019s unique identifier, returned by getInsightSummaries.'),
    maxResults: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .describe('Maximum number of timeline events to return (1-50).'),
    nextToken: nextTokenField(2000),
  })
);
export type GetInsightEventsInput = z.infer<typeof GetInsightEventsInputSchema>;

export const GetTimeSeriesServiceStatisticsInputSchema = lazySchema(() =>
  z.object({
    startTime: startTimeField,
    endTime: endTimeField,
    entitySelectorExpression: z
      .string()
      .max(500)
      .optional()
      .describe(
        'Filter expression selecting the service or edge to aggregate statistics for. If omitted, edge statistics are returned.'
      ),
    forecastStatistics: z
      .boolean()
      .optional()
      .describe(
        'Set to true to include forecasted high/low fault counts. Requires entitySelectorExpression to select a single service by ID.'
      ),
    groupArn: groupArnField,
    groupName: groupNameField,
    nextToken: nextTokenField(2000),
    period: z
      .number()
      .int()
      .positive()
      .optional()
      .describe('Aggregation period in seconds, e.g. 60 for one-minute buckets.'),
  })
);
export type GetTimeSeriesServiceStatisticsInput = z.infer<
  typeof GetTimeSeriesServiceStatisticsInputSchema
>;

export const GetGroupsInputSchema = lazySchema(() =>
  z.object({
    nextToken: nextTokenField(100),
  })
);
export type GetGroupsInput = z.infer<typeof GetGroupsInputSchema>;

export const GetTraceGraphInputSchema = lazySchema(() =>
  z.object({
    traceIds: z
      .array(traceIdField)
      .min(1)
      .max(5)
      .describe(
        'Trace IDs to build a per-request service graph for (1-5 IDs). Get these from getTraceSummaries.'
      ),
    nextToken: nextTokenField(2000),
  })
);
export type GetTraceGraphInput = z.infer<typeof GetTraceGraphInputSchema>;

export const StartTraceRetrievalInputSchema = lazySchema(() =>
  z.object({
    startTime: startTimeField.describe(
      'Start of the historical time range to retrieve, in Unix seconds (inclusive).'
    ),
    endTime: endTimeField.describe(
      'End of the historical time range to retrieve, in Unix seconds (inclusive).'
    ),
    traceIds: z
      .array(traceIdField)
      .max(100)
      .describe(
        'Trace IDs to retrieve from the Transaction Search log group (up to 100). Pass an empty array to retrieve all traces in the time range.'
      ),
  })
);
export type StartTraceRetrievalInput = z.infer<typeof StartTraceRetrievalInputSchema>;

export const GetRetrievedTracesGraphInputSchema = lazySchema(() =>
  z.object({
    retrievalToken: z
      .string()
      .min(1)
      .max(1020)
      .describe('Retrieval token returned by a prior startTraceRetrieval call.'),
    nextToken: nextTokenField(2000),
  })
);
export type GetRetrievedTracesGraphInput = z.infer<typeof GetRetrievedTracesGraphInputSchema>;

export const GetSamplingRulesInputSchema = lazySchema(() =>
  z.object({
    nextToken: nextTokenField(2000),
  })
);
export type GetSamplingRulesInput = z.infer<typeof GetSamplingRulesInputSchema>;
