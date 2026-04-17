/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * GCP Cloud Functions Connector
 *
 * Provides Cloud Run function management capabilities:
 * - Invoke functions (via their HTTP trigger URL)
 * - List functions / services
 * - Get function details
 *
 * Uses the Cloud Run Admin API (run.googleapis.com/v2) under the hood,
 * since Google merged Cloud Functions into Cloud Run. Cloud Run services
 * with deployment type "function" are what was previously Cloud Functions v2.
 *
 * Authentication uses a GCP service account JSON key which provides
 * access tokens for the admin API and ID tokens for service invocation.
 */

import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import { getGcpIdToken, parseServiceAccountKey } from '../../auth_types/gcp_jwt_helpers';

const CLOUD_RUN_API_BASE = 'https://run.googleapis.com/v2';

interface GcpApiResponse {
  data: unknown;
  status: number;
  headers?: Record<string, unknown>;
}

function buildParentPath(projectId: string, region: string): string {
  return `projects/${projectId}/locations/${region}`;
}

/**
 * Extract and throw a meaningful error from GCP API responses.
 */
function throwGcpError(error: unknown): never {
  const err = error as {
    response?: {
      status?: number;
      statusText?: string;
      data?: { error?: { message?: string; code?: number; status?: string } };
    };
  };

  const gcpError = err.response?.data?.error;
  if (gcpError) {
    throw new Error(`GCP API error [${gcpError.status || gcpError.code}]: ${gcpError.message}`);
  }

  const rawBody =
    typeof err.response?.data === 'string'
      ? err.response.data
      : err.response?.data
      ? JSON.stringify(err.response.data)
      : '';
  const detail = rawBody ? ` — ${rawBody}` : '';

  if (err.response?.status === 401) {
    throw new Error(`Authentication failed (401)${detail}`);
  } else if (err.response?.status === 403) {
    throw new Error(`Access denied (403)${detail}`);
  } else {
    throw new Error(
      `GCP API request failed: ${err.response?.statusText || (error as Error).message}${detail}`
    );
  }
}

async function callGcpApi(
  ctx: ActionContext,
  method: 'GET' | 'POST',
  url: string,
  queryParams: Record<string, string> = {},
  body?: string,
  extraHeaders?: Record<string, string>
): Promise<GcpApiResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  };

  const params = Object.keys(queryParams).length > 0 ? queryParams : undefined;

  try {
    const response =
      method === 'POST'
        ? await ctx.client.post(url, body, { headers, params })
        : await ctx.client.get(url, { headers, params });

    return response;
  } catch (error: unknown) {
    throwGcpError(error);
  }
}

export const GcpCloudFunctionsConnector: ConnectorSpec = {
  metadata: {
    id: '.gcp_cloud_functions',
    displayName: 'GCP Cloud Functions',
    description: i18n.translate('connectorSpecs.gcpCloudFunctions.metadata.description', {
      defaultMessage:
        'Invoke GCP Cloud Functions, list available functions, and get function details',
    }),
    minimumLicense: 'gold',
    supportedFeatureIds: ['workflows', 'agentBuilder'],
  },

  auth: {
    types: ['gcp_service_account'],
    headers: {
      Accept: 'application/json',
    },
  },

  schema: z.object({
    projectId: z
      .string()
      .min(1)
      .describe(
        i18n.translate('connectorSpecs.gcpCloudFunctions.config.projectId', {
          defaultMessage: 'GCP Project ID',
        })
      )
      .meta({
        widget: 'text',
        label: i18n.translate('connectorSpecs.gcpCloudFunctions.config.projectId.label', {
          defaultMessage: 'GCP Project ID',
        }),
        placeholder: 'my-gcp-project',
      }),
    region: z
      .string()
      .min(1)
      .describe(
        i18n.translate('connectorSpecs.gcpCloudFunctions.config.region', {
          defaultMessage: 'GCP Region (e.g., us-central1, europe-west1)',
        })
      )
      .meta({
        widget: 'text',
        label: i18n.translate('connectorSpecs.gcpCloudFunctions.config.region.label', {
          defaultMessage: 'GCP Region',
        }),
        placeholder: 'us-central1',
      }),
  }),

  actions: {
    invoke: {
      isTool: true,
      input: z.object({
        functionName: z.string().min(1).describe('Cloud Function or Cloud Run service name'),
        payload: z.unknown().optional().describe('JSON payload to send to the function'),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          functionName: string;
          payload?: unknown;
        };

        const { projectId, region } = ctx.config as { projectId: string; region: string };
        const parent = buildParentPath(projectId, region);
        const servicePath = `${CLOUD_RUN_API_BASE}/${parent}/services/${encodeURIComponent(
          typedInput.functionName
        )}`;

        const { data: serviceData } = await callGcpApi(ctx, 'GET', servicePath);
        const service = serviceData as { uri?: string };

        const serviceUrl = service.uri;
        if (!serviceUrl) {
          throw new Error(
            `Cloud Function '${typedInput.functionName}' does not have an HTTP URL. ` +
              'Ensure the service has an active revision with a valid endpoint.'
          );
        }

        const body = typedInput.payload !== undefined ? JSON.stringify(typedInput.payload) : '{}';

        // Cloud Run requires an OIDC ID token (not an access token) for service invocation.
        const serviceAccountJson = ctx.secrets?.serviceAccountJson as string;
        const sa = parseServiceAccountKey(serviceAccountJson);
        const idToken = await getGcpIdToken(sa.client_email, sa.private_key, serviceUrl);

        const invokeResponse = await callGcpApi(ctx, 'POST', serviceUrl, {}, body, {
          Authorization: `Bearer ${idToken}`,
        });

        return {
          statusCode: invokeResponse.status,
          functionName: typedInput.functionName,
          payload: invokeResponse.data,
        };
      },
    },

    listFunctions: {
      isTool: true,
      input: z.object({
        pageSize: z
          .number()
          .int()
          .min(1)
          .max(500)
          .optional()
          .describe('Maximum number of functions to return (1-500)'),
        pageToken: z.string().optional().describe('Pagination token from a previous response'),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          pageSize?: number;
          pageToken?: string;
        };

        const { projectId, region } = ctx.config as { projectId: string; region: string };
        const parent = buildParentPath(projectId, region);

        const queryParams: Record<string, string> = {};
        if (typedInput.pageSize !== undefined) {
          queryParams.pageSize = String(typedInput.pageSize);
        }
        if (typedInput.pageToken) {
          queryParams.pageToken = typedInput.pageToken;
        }

        const { data } = await callGcpApi(
          ctx,
          'GET',
          `${CLOUD_RUN_API_BASE}/${parent}/services`,
          queryParams
        );
        const body = data as Record<string, unknown>;

        return {
          functions: ((body.services as Array<Record<string, unknown>>) || []).map(
            (svc: Record<string, unknown>) => {
              const nameParts = ((svc.name as string) || '').split('/');
              const template = svc.template as Record<string, unknown> | undefined;
              const containers = template?.containers as Array<Record<string, unknown>> | undefined;
              const scaling = template?.scaling as Record<string, unknown> | undefined;
              return {
                functionName: nameParts[nameParts.length - 1],
                fullName: svc.name,
                description: svc.description,
                uri: svc.uri,
                updateTime: svc.updateTime,
                createTime: svc.createTime,
                ingress: svc.ingress,
                launchStage: svc.launchStage,
                image: containers?.[0]?.image,
                maxInstanceCount: scaling?.maxInstanceCount,
                minInstanceCount: scaling?.minInstanceCount,
              };
            }
          ),
          nextPageToken: body.nextPageToken || null,
        };
      },
    },

    getFunction: {
      isTool: true,
      input: z.object({
        functionName: z.string().min(1).describe('Cloud Function or Cloud Run service name'),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          functionName: string;
        };

        const { projectId, region } = ctx.config as { projectId: string; region: string };
        const parent = buildParentPath(projectId, region);
        const path = `${CLOUD_RUN_API_BASE}/${parent}/services/${encodeURIComponent(
          typedInput.functionName
        )}`;

        const { data } = await callGcpApi(ctx, 'GET', path);
        const svc = data as Record<string, unknown>;
        const template = svc.template as Record<string, unknown> | undefined;
        const containers = template?.containers as Array<Record<string, unknown>> | undefined;
        const scaling = template?.scaling as Record<string, unknown> | undefined;
        const nameParts = ((svc.name as string) || '').split('/');

        return {
          functionName: nameParts[nameParts.length - 1],
          fullName: svc.name,
          description: svc.description,
          uri: svc.uri,
          updateTime: svc.updateTime,
          createTime: svc.createTime,
          labels: svc.labels,
          ingress: svc.ingress,
          launchStage: svc.launchStage,
          image: containers?.[0]?.image,
          serviceAccountEmail: template?.serviceAccount,
          timeout: template?.timeout,
          maxInstanceCount: scaling?.maxInstanceCount,
          minInstanceCount: scaling?.minInstanceCount,
        };
      },
    },
  },

  test: {
    handler: async (ctx) => {
      try {
        const { projectId, region } = ctx.config as { projectId: string; region: string };
        const parent = buildParentPath(projectId, region);

        await callGcpApi(ctx, 'GET', `${CLOUD_RUN_API_BASE}/${parent}/services`, {
          pageSize: '1',
        });

        return {
          ok: true,
          message: 'Successfully connected to GCP Cloud Run API',
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          ok: false,
          message: `Failed to connect: ${errorMessage}`,
        };
      }
    },
    description: i18n.translate('connectorSpecs.gcpCloudFunctions.test.description', {
      defaultMessage: 'Verifies GCP Cloud Functions API credentials and project access',
    }),
  },
};
