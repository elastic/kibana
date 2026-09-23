/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * AWS X-Ray Connector
 *
 * Gives workflow authors and agents access to X-Ray Insights (the alert
 * analog for distributed tracing anomalies), the service graph, and trace
 * search/detail retrieval, so a service anomaly can be investigated without
 * opening the X-Ray console.
 *
 * Authentication uses the aws_credentials auth type, which stores an Access
 * Key ID and Secret Access Key as encrypted secrets and signs every request
 * automatically via an axios interceptor (SigV4). Requests are sent as JSON
 * POSTs to https://xray.{region}.amazonaws.com per the X-Ray API reference:
 * https://docs.aws.amazon.com/xray/latest/api/API_Operations.html
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import {
  GetInsightSummariesInputSchema,
  GetInsightInputSchema,
  GetServiceGraphInputSchema,
  GetTraceSummariesInputSchema,
  BatchGetTracesInputSchema,
  GetInsightImpactGraphInputSchema,
  GetInsightEventsInputSchema,
  GetTimeSeriesServiceStatisticsInputSchema,
  GetGroupsInputSchema,
  GetTraceGraphInputSchema,
  StartTraceRetrievalInputSchema,
  GetRetrievedTracesGraphInputSchema,
  GetSamplingRulesInputSchema,
  type GetInsightSummariesInput,
  type GetInsightInput,
  type GetServiceGraphInput,
  type GetTraceSummariesInput,
  type BatchGetTracesInput,
  type GetInsightImpactGraphInput,
  type GetInsightEventsInput,
  type GetTimeSeriesServiceStatisticsInput,
  type GetGroupsInput,
  type GetTraceGraphInput,
  type StartTraceRetrievalInput,
  type GetRetrievedTracesGraphInput,
  type GetSamplingRulesInput,
} from './types';

interface XRayApiResponse {
  data: unknown;
  status: number;
}

/**
 * Make an authenticated JSON POST request to the X-Ray API.
 * SigV4 signing is handled transparently by the aws_credentials auth interceptor
 * (service name "xray" is inferred from the xray.{region}.amazonaws.com hostname).
 */
async function callXRayApi(
  ctx: ActionContext,
  path: string,
  body: Record<string, unknown>
): Promise<XRayApiResponse> {
  const { region } = ctx.config as { region: string };
  const url = `https://xray.${region}.amazonaws.com${path}`;

  // Omit undefined fields rather than sending explicit nulls the API might reject.
  const payload = Object.fromEntries(
    Object.entries(body).filter(([, value]) => value !== undefined)
  );

  try {
    return await ctx.client.post(url, JSON.stringify(payload), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const err = error as {
      response?: {
        status?: number;
        statusText?: string;
        headers?: Record<string, unknown>;
        data?: unknown;
      };
      message?: string;
    };

    const status = err.response?.status;
    const data = err.response?.data;
    const errorType =
      (err.response?.headers?.['x-amzn-errortype'] as string | undefined)?.split(':')[0] ||
      (typeof data === 'object' && data !== null
        ? ((data as Record<string, unknown>).__type as string | undefined)?.split('#').pop() ||
          ((data as Record<string, unknown>).Type as string | undefined)
        : undefined);
    const message =
      (typeof data === 'object' && data !== null
        ? ((data as Record<string, unknown>).message as string | undefined) ||
          ((data as Record<string, unknown>).Message as string | undefined)
        : undefined) || err.message;

    if (status === 401 || status === 403) {
      throw new Error(
        `Authentication failed. Check your AWS Access Key ID, Secret Access Key, and IAM permissions for X-Ray (${
          errorType || status
        }): ${message}`
      );
    }
    if (errorType) {
      throw new Error(`AWS X-Ray Error [${errorType}]: ${message}`);
    }
    throw new Error(`AWS X-Ray API request failed: ${message || err.response?.statusText}`);
  }
}

export const AwsXRay: ConnectorSpec = {
  metadata: {
    id: '.aws_x_ray',
    displayName: 'AWS X-Ray',
    description: i18n.translate('connectorSpecs.awsXRay.metadata.description', {
      defaultMessage:
        'Retrieve insights, service graphs, and trace summaries and details from AWS X-Ray',
    }),
    minimumLicense: 'gold',
    // A new connector type must reach Production-NonCanary before it can declare
    // user-facing features. Ship ['agentBuilder'] first, then add 'workflows'
    // in a follow-up PR once this connector type exists on every Production-NonCanary node.
    supportedFeatureIds: ['agentBuilder'],
  },

  auth: {
    types: ['aws_credentials'],
  },

  schema: lazySchema(() =>
    z.object({
      region: z
        .string()
        .min(1)
        .max(30)
        .regex(/^[a-z0-9-]+$/, 'Must be a valid AWS region identifier, e.g. us-east-1.')
        .describe(
          i18n.translate('connectorSpecs.awsXRay.config.region', {
            defaultMessage: 'AWS Region (e.g., us-east-1, eu-west-1)',
          })
        )
        .meta({
          widget: 'text',
          label: i18n.translate('connectorSpecs.awsXRay.config.region.label', {
            defaultMessage: 'AWS Region',
          }),
          placeholder: 'us-east-1',
        }),
    })
  ),

  actions: {
    getInsightSummaries: {
      isTool: true,
      scope: 'read',
      description:
        'List open and closed X-Ray insights for a group within a time range, optionally filtered by state. This is the primary entry point for reacting to a service anomaly: it returns each insight\u2019s ID, summary, root-cause service, and top anomalous services. Use the returned insightId with getInsight, getInsightImpactGraph, or getInsightEvents to dig deeper.',
      input: GetInsightSummariesInputSchema,
      handler: async (ctx, input: GetInsightSummariesInput) => {
        const { data } = await callXRayApi(ctx, '/InsightSummaries', {
          StartTime: input.startTime,
          EndTime: input.endTime,
          GroupARN: input.groupArn,
          GroupName: input.groupName,
          MaxResults: input.maxResults,
          NextToken: input.nextToken,
          States: input.states,
        });
        return data;
      },
    },

    getInsight: {
      isTool: true,
      scope: 'read',
      description:
        'Get the full summary of a single X-Ray insight by ID: its categories, root-cause service, client/root-cause impact statistics, top anomalous services, state, and time range. Use the insightId returned by getInsightSummaries.',
      input: GetInsightInputSchema,
      handler: async (ctx, input: GetInsightInput) => {
        const { data } = await callXRayApi(ctx, '/Insight', {
          InsightId: input.insightId,
        });
        return data;
      },
    },

    getServiceGraph: {
      isTool: true,
      scope: 'read',
      description:
        'Retrieve the service map for a time range (optionally scoped to a group): every service node with per-node error, fault, and latency statistics, and the edges (calls) between them. This is the core health snapshot used to see what an anomaly touched.',
      input: GetServiceGraphInputSchema,
      handler: async (ctx, input: GetServiceGraphInput) => {
        const { data } = await callXRayApi(ctx, '/ServiceGraph', {
          StartTime: input.startTime,
          EndTime: input.endTime,
          GroupARN: input.groupArn,
          GroupName: input.groupName,
          NextToken: input.nextToken,
        });
        return data;
      },
    },

    getTraceSummaries: {
      isTool: true,
      scope: 'read',
      description:
        'Search for trace IDs and summaries in a time range using an optional X-Ray filter expression (e.g. by service, error, fault, or annotation). Use this to find the specific requests behind a spike or an insight, then pass the returned trace IDs to batchGetTraces for full detail or getTraceGraph for per-request topology.',
      input: GetTraceSummariesInputSchema,
      handler: async (ctx, input: GetTraceSummariesInput) => {
        const { data } = await callXRayApi(ctx, '/TraceSummaries', {
          StartTime: input.startTime,
          EndTime: input.endTime,
          FilterExpression: input.filterExpression,
          NextToken: input.nextToken,
          Sampling: input.sampling,
          SamplingStrategy: input.samplingStrategy
            ? {
                Name: input.samplingStrategy.name,
                Value: input.samplingStrategy.value,
              }
            : undefined,
          TimeRangeType: input.timeRangeType,
        });
        return data;
      },
    },

    batchGetTraces: {
      isTool: true,
      scope: 'read',
      description:
        'Retrieve the full segment detail (the complete trace document) for up to 5 trace IDs. This is the drill-down step after finding trace IDs with getTraceSummaries. Any IDs that could not be processed are returned in unprocessedTraceIds.',
      input: BatchGetTracesInputSchema,
      handler: async (ctx, input: BatchGetTracesInput) => {
        const { data } = await callXRayApi(ctx, '/Traces', {
          TraceIds: input.traceIds,
          NextToken: input.nextToken,
        });
        return data;
      },
    },

    getInsightImpactGraph: {
      isTool: true,
      scope: 'read',
      description:
        'Get the service graph scoped to a single insight, showing which downstream services the anomaly touched (structural information only \u2014 combine with getServiceGraph for full statistics). Use the insightId returned by getInsightSummaries. The gap between startTime and endTime cannot exceed six hours.',
      input: GetInsightImpactGraphInputSchema,
      handler: async (ctx, input: GetInsightImpactGraphInput) => {
        const { data } = await callXRayApi(ctx, '/InsightImpactGraph', {
          InsightId: input.insightId,
          StartTime: input.startTime,
          EndTime: input.endTime,
          NextToken: input.nextToken,
        });
        return data;
      },
    },

    getInsightEvents: {
      isTool: true,
      scope: 'read',
      description:
        'Get the ordered timeline of intermediate states X-Ray recorded while reevaluating an insight, so a workflow can see how the anomaly evolved (impact statistics and top anomalous services at each point) before deciding how to react. Use the insightId returned by getInsightSummaries.',
      input: GetInsightEventsInputSchema,
      handler: async (ctx, input: GetInsightEventsInput) => {
        const { data } = await callXRayApi(ctx, '/InsightEvents', {
          InsightId: input.insightId,
          MaxResults: input.maxResults,
          NextToken: input.nextToken,
        });
        return data;
      },
    },

    getTimeSeriesServiceStatistics: {
      isTool: true,
      scope: 'read',
      description:
        'Get error, fault, and response-time statistics as a time series over a time range, aggregated by period, for a service or group. Use this to quantify an anomaly\u2019s blast radius or trend over time. If entitySelectorExpression is omitted, edge statistics are returned.',
      input: GetTimeSeriesServiceStatisticsInputSchema,
      handler: async (ctx, input: GetTimeSeriesServiceStatisticsInput) => {
        const { data } = await callXRayApi(ctx, '/TimeSeriesServiceStatistics', {
          StartTime: input.startTime,
          EndTime: input.endTime,
          EntitySelectorExpression: input.entitySelectorExpression,
          ForecastStatistics: input.forecastStatistics,
          GroupARN: input.groupArn,
          GroupName: input.groupName,
          NextToken: input.nextToken,
          Period: input.period,
        });
        return data;
      },
    },

    getGroups: {
      isTool: true,
      scope: 'read',
      description:
        'List all active X-Ray groups (name, ARN, filter expression, and insights configuration). Use this to resolve a group\u2019s ARN or name before calling getInsightSummaries, getServiceGraph, or getTimeSeriesServiceStatistics.',
      input: GetGroupsInputSchema,
      handler: async (ctx, input: GetGroupsInput) => {
        const { data } = await callXRayApi(ctx, '/Groups', {
          NextToken: input.nextToken,
        });
        return data;
      },
    },

    getTraceGraph: {
      isTool: true,
      scope: 'read',
      description:
        'Build a service graph scoped to a specific set of trace IDs (1-5), for per-request topology during an investigation. Use the trace IDs returned by getTraceSummaries.',
      input: GetTraceGraphInputSchema,
      handler: async (ctx, input: GetTraceGraphInput) => {
        const { data } = await callXRayApi(ctx, '/TraceGraph', {
          TraceIds: input.traceIds,
          NextToken: input.nextToken,
        });
        return data;
      },
    },

    startTraceRetrieval: {
      isTool: true,
      scope: 'write',
      description:
        'Start an asynchronous retrieval job for traces in the Transaction Search CloudWatch log group over a time range (for deep historical pulls that would time out a blocking call). Returns a retrievalToken; pass it to getRetrievedTracesGraph once the job completes. Retrievals time out after 60 minutes, so segment long time ranges into multiple calls.',
      input: StartTraceRetrievalInputSchema,
      handler: async (ctx, input: StartTraceRetrievalInput) => {
        const { data } = await callXRayApi(ctx, '/StartTraceRetrieval', {
          StartTime: input.startTime,
          EndTime: input.endTime,
          TraceIds: input.traceIds,
        });
        return data;
      },
    },

    getRetrievedTracesGraph: {
      isTool: true,
      scope: 'read',
      description:
        'Get the service graph produced by a completed startTraceRetrieval job, using its retrievalToken. The response is empty until retrievalStatus is COMPLETE \u2014 poll this action until the status changes from SCHEDULED/RUNNING to COMPLETE (or FAILED/CANCELLED/TIMEOUT).',
      input: GetRetrievedTracesGraphInputSchema,
      handler: async (ctx, input: GetRetrievedTracesGraphInput) => {
        const { data } = await callXRayApi(ctx, '/GetRetrievedTracesGraph', {
          RetrievalToken: input.retrievalToken,
          NextToken: input.nextToken,
        });
        return data;
      },
    },

    getSamplingRules: {
      isTool: true,
      scope: 'read',
      description:
        'List all X-Ray sampling rules (fixed rate, reservoir size, service/host/URL match conditions). Use this to audit how much trace data X-Ray is capturing for a service before relying on trace-based analysis.',
      input: GetSamplingRulesInputSchema,
      handler: async (ctx, input: GetSamplingRulesInput) => {
        const { data } = await callXRayApi(ctx, '/GetSamplingRules', {
          NextToken: input.nextToken,
        });
        return data;
      },
    },
  },

  skill: [
    '## AWS X-Ray Connector',
    '',
    'X-Ray Insights are the alert analog for distributed tracing: X-Ray watches the service graph and opens an insight when error, fault, or latency behavior drifts for a group.',
    '',
    '### Typical investigation flow',
    '1. Call `getInsightSummaries` (with a group ARN/name and time range) to find open insights, or `getGroups` first if you don\u2019t know the group.',
    '2. Call `getInsight` with the `insightId` to see the root-cause service, categories, and impact statistics.',
    '3. Call `getServiceGraph` (and, for blast radius, `getInsightImpactGraph` and `getTimeSeriesServiceStatistics`) to see what else was affected.',
    '4. Call `getTraceSummaries` with a filter expression to find the specific requests behind the anomaly.',
    '5. Call `batchGetTraces` (full segment detail) or `getTraceGraph` (per-request topology) with the trace IDs from step 4.',
    '',
    '### Gotchas',
    '- All time parameters (`startTime`, `endTime`) are Unix timestamps in seconds, not milliseconds or ISO strings. Compute them from the actual current wall-clock time, not an assumed or remembered date \u2014 a wrong `startTime` commonly triggers "StartTime parameter cannot be earlier than 30 days ago" because insight data has a ~30-day retention window.',
    '- `getInsightSummaries` requires either `groupArn` or `groupName` \u2014 use `getGroups` to look one up if you only know the service name.',
    '- `getInsightImpactGraph` requires the time range between `startTime` and `endTime` to be six hours or less, even though the insight itself may span longer.',
    '- `batchGetTraces` and `getTraceGraph` accept at most 5 trace IDs per call; page through more with multiple calls.',
    '- `startTraceRetrieval` / `getRetrievedTracesGraph` are for the Transaction Search log group and require polling `retrievalStatus` until it reaches `COMPLETE` \u2014 for direct X-Ray trace data, prefer `batchGetTraces` instead.',
  ].join('\n'),

  test: {
    // enabled must be explicitly set to true, otherwise the "Test connector"
    // button stays disabled in the UI even though a handler is defined.
    enabled: true,
    description: i18n.translate('connectorSpecs.awsXRay.test.description', {
      defaultMessage: 'Verifies the connection by listing X-Ray groups',
    }),
    handler: async (ctx) => {
      await callXRayApi(ctx, '/Groups', {});
      return {};
    },
  },
};
