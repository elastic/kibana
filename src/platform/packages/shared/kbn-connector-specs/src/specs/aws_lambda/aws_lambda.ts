/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * AWS Lambda Connector
 *
 * Provides Lambda function management capabilities:
 * - Invoke functions (sync and async)
 * - List functions
 * - Get function details
 *
 * Authentication uses the aws_credentials auth type which stores
 * Access Key ID and Secret Access Key as encrypted secrets and
 * signs requests automatically via an axios interceptor (SigV4).
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { ActionContext, ConnectorSpec } from '../../connector_spec';

interface LambdaApiResponse {
  data: unknown;
  status: number;
  headers?: Record<string, unknown>;
}

/**
 * Make an authenticated request to the Lambda API.
 * SigV4 signing is handled transparently by the aws_credentials auth interceptor.
 */
async function callLambdaApi(
  ctx: ActionContext,
  method: 'GET' | 'POST',
  path: string,
  queryParams: Record<string, string> = {},
  body?: string,
  extraHeaders?: Record<string, string>
): Promise<LambdaApiResponse> {
  const { region } = ctx.config as { region: string };
  const host = `lambda.${region}.amazonaws.com`;

  const sortedParams = Object.keys(queryParams).sort();
  const queryString = sortedParams
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`)
    .join('&');

  const url = `https://${host}${path}${queryString ? `?${queryString}` : ''}`;

  const headers: Record<string, string> = {};
  if (extraHeaders) {
    Object.assign(headers, extraHeaders);
  }

  try {
    const response =
      method === 'POST'
        ? await ctx.client.post(url, body, { headers })
        : await ctx.client.get(url, { headers });

    return response;
  } catch (error: unknown) {
    const err = error as {
      response?: {
        status?: number;
        statusText?: string;
        data?: unknown;
      };
    };

    let lambdaError: { type: string; message: string } | null = null;
    if (err.response?.data && typeof err.response.data === 'object') {
      const data = err.response.data as Record<string, unknown>;
      if (data.Type || data.Message || data.message) {
        lambdaError = {
          type: (data.Type as string) || 'UnknownError',
          message:
            (data.Message as string) || (data.message as string) || 'An unknown error occurred',
        };
      }
    }

    if (lambdaError) {
      throw new Error(`AWS Lambda Error [${lambdaError.type}]: ${lambdaError.message}`);
    } else if (err.response?.status === 401) {
      throw new Error(
        'Authentication failed. Please check your AWS Access Key ID and Secret Access Key.'
      );
    } else if (err.response?.status === 403) {
      throw new Error(
        'Access denied. Your AWS IAM user lacks the required permissions for this operation.'
      );
    } else {
      throw new Error(
        `AWS Lambda API request failed: ${err.response?.statusText || (error as Error).message}`
      );
    }
  }
}

export const AwsLambdaConnector: ConnectorSpec = {
  metadata: {
    id: '.aws_lambda',
    displayName: 'AWS Lambda',
    description: i18n.translate('connectorSpecs.awsLambda.metadata.description', {
      defaultMessage:
        'Invoke AWS Lambda functions, list available functions, and get function details',
    }),
    minimumLicense: 'gold',
    supportedFeatureIds: ['workflows', 'agentBuilder'],
  },

  auth: {
    types: ['aws_credentials'],
  },

  schema: lazySchema(() =>
    z.object({
      region: z
        .string()
        .min(1)
        .describe(
          i18n.translate('connectorSpecs.awsLambda.config.region', {
            defaultMessage: 'AWS Region (e.g., us-east-1, eu-west-1)',
          })
        )
        .meta({
          widget: 'text',
          label: i18n.translate('connectorSpecs.awsLambda.config.region.label', {
            defaultMessage: 'AWS Region',
          }),
          placeholder: 'us-east-1',
        }),
    })
  ),

  actions: {
    invoke: {
      isTool: true,
      input: lazySchema(() =>
        z.object({
          functionName: z.string().min(1).describe('Lambda function name or ARN'),
          payload: z.unknown().optional().describe('JSON payload to send to the function'),
          invocationType: z
            .enum(['RequestResponse', 'Event', 'DryRun'])
            .default('RequestResponse')
            .describe('Invocation type: RequestResponse (sync), Event (async), or DryRun'),
          qualifier: z.string().optional().describe('Function version or alias to invoke'),
        })
      ),
      handler: async (ctx, input) => {
        const typedInput = input as {
          functionName: string;
          payload?: unknown;
          invocationType?: 'RequestResponse' | 'Event' | 'DryRun';
          qualifier?: string;
        };

        const path = `/2015-03-31/functions/${encodeURIComponent(
          typedInput.functionName
        )}/invocations`;
        const queryParams: Record<string, string> = {};
        if (typedInput.qualifier) {
          queryParams.Qualifier = typedInput.qualifier;
        }

        const body = typedInput.payload !== undefined ? JSON.stringify(typedInput.payload) : '{}';
        const invocationType = typedInput.invocationType || 'RequestResponse';

        const response = await callLambdaApi(ctx, 'POST', path, queryParams, body, {
          'X-Amz-Invocation-Type': invocationType,
          'X-Amz-Log-Type': 'Tail',
        });

        const logResult = response.headers?.['x-amz-log-result'];
        const functionError = response.headers?.['x-amz-function-error'];

        const result: Record<string, unknown> = {
          statusCode: response.status,
          functionName: typedInput.functionName,
          invocationType,
        };

        if (functionError) {
          result.functionError = functionError;
        }

        if (logResult && typeof logResult === 'string') {
          try {
            result.logResult = atob(logResult);
          } catch {
            result.logResult = logResult;
          }
        }

        if (invocationType === 'Event') {
          result.message = `Function ${typedInput.functionName} invoked asynchronously`;
        } else {
          result.payload = response.data;
        }

        return result;
      },
    },

    listFunctions: {
      isTool: true,
      input: lazySchema(() =>
        z.object({
          maxItems: z
            .number()
            .optional()
            .describe('Maximum number of functions to return (1-10000)'),
          marker: z.string().optional().describe('Pagination token from a previous response'),
        })
      ),
      handler: async (ctx, input) => {
        const typedInput = input as {
          maxItems?: number;
          marker?: string;
        };

        const queryParams: Record<string, string> = {};
        if (typedInput.maxItems) {
          queryParams.MaxItems = String(typedInput.maxItems);
        }
        if (typedInput.marker) {
          queryParams.Marker = typedInput.marker;
        }

        const { data } = await callLambdaApi(ctx, 'GET', '/2015-03-31/functions/', queryParams);
        const body = data as Record<string, unknown>;

        return {
          functions: ((body.Functions as Array<Record<string, unknown>>) || []).map(
            (fn: Record<string, unknown>) => ({
              functionName: fn.FunctionName,
              functionArn: fn.FunctionArn,
              runtime: fn.Runtime,
              description: fn.Description,
              lastModified: fn.LastModified,
              memorySize: fn.MemorySize,
              timeout: fn.Timeout,
              handler: fn.Handler,
            })
          ),
          nextMarker: body.NextMarker || null,
        };
      },
    },

    getFunction: {
      isTool: true,
      input: lazySchema(() =>
        z.object({
          functionName: z.string().min(1).describe('Lambda function name or ARN'),
          qualifier: z.string().optional().describe('Function version or alias'),
        })
      ),
      handler: async (ctx, input) => {
        const typedInput = input as {
          functionName: string;
          qualifier?: string;
        };

        const path = `/2015-03-31/functions/${encodeURIComponent(typedInput.functionName)}`;
        const queryParams: Record<string, string> = {};
        if (typedInput.qualifier) {
          queryParams.Qualifier = typedInput.qualifier;
        }

        const { data } = await callLambdaApi(ctx, 'GET', path, queryParams);
        const body = data as Record<string, unknown>;

        const config = (body.Configuration as Record<string, unknown>) || {};
        return {
          functionName: config.FunctionName,
          functionArn: config.FunctionArn,
          runtime: config.Runtime,
          role: config.Role,
          handler: config.Handler,
          description: config.Description,
          timeout: config.Timeout,
          memorySize: config.MemorySize,
          lastModified: config.LastModified,
          state: config.State,
          lastUpdateStatus: config.LastUpdateStatus,
        };
      },
    },
  },

  test: {
    handler: async (ctx) => {
      try {
        await callLambdaApi(ctx, 'GET', '/2015-03-31/functions/', { MaxItems: '1' });
        return {
          ok: true,
          message: 'Successfully connected to AWS Lambda API',
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          ok: false,
          message: `Failed to connect: ${errorMessage}`,
        };
      }
    },
    description: i18n.translate('connectorSpecs.awsLambda.test.description', {
      defaultMessage: 'Verifies AWS Lambda API credentials',
    }),
  },
};
