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
 * This connector provides Lambda function management capabilities:
 * - Invoke functions (sync and async)
 * - List functions
 * - Get function details
 *
 * Authentication follows the same pattern as Elastic's CloudWatch integration:
 * - Access Key ID
 * - Secret Access Key
 * - Region
 */

import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import { UISchemas } from '../../connector_spec_ui';

const EMPTY_BODY_SHA256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

async function sha256Hash(message: string): Promise<string> {
  const textEncoder = new TextEncoder();
  const data = textEncoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hmacSha256(key: BufferSource, message: string): Promise<ArrayBuffer> {
  const textEncoder = new TextEncoder();
  const messageData = textEncoder.encode(message);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  return await crypto.subtle.sign('HMAC', cryptoKey, messageData);
}

/**
 * Calculates the AWS Signature V4 signature for the given input.
 * TODO: Extract this to a shared utility function, when we introduce more AWS connectors.
 * @param secretAccessKey - The AWS Secret Access Key.
 * @param dateStamp - The date stamp in the format YYYYMMDD.
 * @param region - The AWS region.
 * @param service - The AWS service.
 * @param stringToSign - The string to sign.
 * @returns The AWS Signature V4 signature.
 */
async function calculateSignature(
  secretAccessKey: string,
  dateStamp: string,
  region: string,
  service: string,
  stringToSign: string
): Promise<string> {
  const textEncoder = new TextEncoder();

  const kDate = await hmacSha256(textEncoder.encode('AWS4' + secretAccessKey), dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, 'aws4_request');
  const signature = await hmacSha256(kSigning, stringToSign);

  const signatureArray = Array.from(new Uint8Array(signature));
  return signatureArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * AWS Signature V4 signing for both GET and POST requests.
 * Supports JSON body payloads (required for Lambda Invoke).
 */
async function signAwsRequest(
  method: string,
  host: string,
  path: string,
  queryParams: Record<string, string>,
  accessKeyId: string,
  secretAccessKey: string,
  region: string,
  body?: string
): Promise<Record<string, string>> {
  const service = 'lambda';
  const algorithm = 'AWS4-HMAC-SHA256';
  const now = new Date();
  const dateStamp = now.toISOString().split('T')[0].replace(/-/g, '');
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');

  const sortedParams = Object.keys(queryParams).sort();
  const canonicalQuerystring = sortedParams
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`)
    .join('&');

  const hasBody = body !== undefined && body !== '';
  const contentType = hasBody ? 'application/json' : '';

  const canonicalHeaders = hasBody
    ? `content-type:${contentType}\nhost:${host}\nx-amz-date:${amzDate}\n`
    : `host:${host}\nx-amz-date:${amzDate}\n`;

  const signedHeaders = hasBody ? 'content-type;host;x-amz-date' : 'host;x-amz-date';

  const payloadHash = hasBody ? await sha256Hash(body) : EMPTY_BODY_SHA256;

  const canonicalRequest = [
    method,
    path,
    canonicalQuerystring,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const canonicalRequestHash = await sha256Hash(canonicalRequest);
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [algorithm, amzDate, credentialScope, canonicalRequestHash].join('\n');

  const signature = await calculateSignature(
    secretAccessKey,
    dateStamp,
    region,
    service,
    stringToSign
  );

  const authorizationHeader = `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const headers: Record<string, string> = {
    Host: host,
    'X-Amz-Date': amzDate,
    Authorization: authorizationHeader,
  };

  if (hasBody) {
    headers['Content-Type'] = contentType;
  }

  return headers;
}

interface LambdaApiResponse {
  data: unknown;
  status: number;
  headers?: Record<string, unknown>;
}

async function callLambdaApi(
  ctx: ActionContext,
  method: 'GET' | 'POST',
  path: string,
  queryParams: Record<string, string> = {},
  body?: string,
  extraHeaders?: Record<string, string>
): Promise<LambdaApiResponse> {
  const { region, accessKeyId, secretAccessKey } = ctx.config as {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
  const host = `lambda.${region}.amazonaws.com`;

  const headers = await signAwsRequest(
    method,
    host,
    path,
    queryParams,
    accessKeyId,
    secretAccessKey,
    region,
    body
  );

  if (extraHeaders) {
    Object.assign(headers, extraHeaders);
  }

  const sortedParams = Object.keys(queryParams).sort();
  const queryString = sortedParams
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`)
    .join('&');

  const url = `https://${host}${path}${queryString ? `?${queryString}` : ''}`;

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
    supportedFeatureIds: ['workflows'],
  },

  schema: z.object({
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
    accessKeyId: z
      .string()
      .min(1)
      .describe(
        i18n.translate('connectorSpecs.awsLambda.config.accessKeyId', {
          defaultMessage: 'AWS Access Key ID',
        })
      )
      .meta({
        widget: 'text',
        label: i18n.translate('connectorSpecs.awsLambda.config.accessKeyId.label', {
          defaultMessage: 'Access Key ID',
        }),
        placeholder: 'AKIAIOSFODNN7EXAMPLE',
      }),
    secretAccessKey: UISchemas.secret()
      .describe(
        i18n.translate('connectorSpecs.awsLambda.config.secretAccessKey', {
          defaultMessage: 'AWS Secret Access Key',
        })
      )
      .meta({
        sensitive: true,
        widget: 'password',
        label: i18n.translate('connectorSpecs.awsLambda.config.secretAccessKey.label', {
          defaultMessage: 'Secret Access Key',
        }),
        placeholder: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      }),
  }),

  actions: {
    invoke: {
      isTool: true,
      input: z.object({
        functionName: z.string().min(1).describe('Lambda function name or ARN'),
        payload: z.unknown().optional().describe('JSON payload to send to the function'),
        invocationType: z
          .enum(['RequestResponse', 'Event', 'DryRun'])
          .default('RequestResponse')
          .describe('Invocation type: RequestResponse (sync), Event (async), or DryRun'),
        qualifier: z.string().optional().describe('Function version or alias to invoke'),
      }),
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
      input: z.object({
        maxItems: z.number().optional().describe('Maximum number of functions to return (1-10000)'),
        marker: z.string().optional().describe('Pagination token from a previous response'),
      }),
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
      input: z.object({
        functionName: z.string().min(1).describe('Lambda function name or ARN'),
        qualifier: z.string().optional().describe('Function version or alias'),
      }),
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
