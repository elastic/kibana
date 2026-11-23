/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Sophos Central connector
 *
 * Alert lifecycle, endpoint containment, IOC blocklist management, tamper
 * protection, and XDR detections for SOC workflows.
 *
 * Authentication: OAuth 2.0 client credentials (clientId + clientSecret).
 * Token endpoint: https://id.sophos.com/api/v2/oauth2/token
 * Regional routing: GET {apiUrl}/whoami/v1 → tenantId + regional base URL.
 * Every action call uses the regional base URL with X-Tenant-ID header.
 *
 * https://developer.sophos.com
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { AxiosError, AxiosRequestConfig } from 'axios';
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import { UISchemas } from '../../connector_spec_ui';
import {
  ActOnAlertInputSchema,
  ActOnAlertsBulkInputSchema,
  AddAllowedItemInputSchema,
  AddBlockedItemInputSchema,
  DeleteBlockedItemInputSchema,
  DeisolateEndpointInputSchema,
  GetAlertInputSchema,
  GetEndpointInputSchema,
  GetTamperProtectionInputSchema,
  IsolateEndpointInputSchema,
  ListAlertsInputSchema,
  ListBlockedItemsInputSchema,
  ListDetectionsInputSchema,
  ListEndpointsInputSchema,
  ScanEndpointInputSchema,
  UpdateTamperProtectionInputSchema,
  type ActOnAlertInput,
  type ActOnAlertsBulkInput,
  type AddAllowedItemInput,
  type AddBlockedItemInput,
  type DeleteBlockedItemInput,
  type DeisolateEndpointInput,
  type GetAlertInput,
  type GetEndpointInput,
  type GetTamperProtectionInput,
  type IsolateEndpointInput,
  type ListAlertsInput,
  type ListBlockedItemsInput,
  type ListDetectionsInput,
  type ListEndpointsInput,
  type ScanEndpointInput,
  type UpdateTamperProtectionInput,
} from './types';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

interface SophosCentralConfig {
  apiUrl?: string;
}

const getGlobalApiUrl = (ctx: ActionContext): string => {
  const cfg = ctx.config as SophosCentralConfig | undefined;
  return (cfg?.apiUrl ?? 'https://api.central.sophos.com').replace(/\/+$/, '');
};

// ---------------------------------------------------------------------------
// Whoami discovery (called once per action to resolve tenant + regional host)
// ---------------------------------------------------------------------------

interface WhoamiResult {
  tenantId: string;
  dataRegion: string;
}

async function whoami(ctx: ActionContext): Promise<WhoamiResult> {
  const globalUrl = getGlobalApiUrl(ctx);
  const response = await ctx.client.get(`${globalUrl}/whoami/v1`, { timeout: 10_000 });
  const data = response.data as {
    id?: string;
    apiHosts?: { dataRegion?: string };
  };
  const tenantId = data?.id;
  const dataRegion = data?.apiHosts?.dataRegion?.replace(/\/+$/, '');
  if (!tenantId || !dataRegion) {
    throw new Error(
      'Sophos Central whoami response is missing tenantId or dataRegion. ' +
        'Confirm the API URL and credentials are correct.'
    );
  }
  return { tenantId, dataRegion };
}

// ---------------------------------------------------------------------------
// Request helper with retry (exponential backoff + full jitter)
// ---------------------------------------------------------------------------

const RETRY_ON = new Set([429, 500, 502, 503, 504]);
const NO_RETRY_ON = new Set([400, 401, 403, 404, 405, 409, 413, 422]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3, idempotent = true): Promise<T> {
  const effectiveMax = idempotent ? maxAttempts : 1;
  let lastError: unknown;
  for (let attempt = 0; attempt < effectiveMax; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const status = (err as AxiosError)?.response?.status;
      if (status !== undefined && NO_RETRY_ON.has(status)) {
        throw err;
      }
      if (status !== undefined && !RETRY_ON.has(status)) {
        throw err;
      }
      lastError = err;
      if (attempt < effectiveMax - 1) {
        // Full-jitter backoff: random(0, min(30000, 1000 * 2^attempt))
        const cap = 30_000;
        const base = 1_000 * Math.pow(2, attempt);
        const delay = Math.random() * Math.min(cap, base);
        await sleep(delay);
      }
    }
  }
  throw lastError;
}

async function request<T = unknown>(
  ctx: ActionContext,
  method: string,
  path: string,
  options?: { params?: Record<string, unknown>; data?: unknown; idempotent?: boolean }
): Promise<T> {
  const { tenantId, dataRegion } = await whoami(ctx);
  const idempotent = options?.idempotent ?? (method === 'GET' || method === 'DELETE');
  return withRetry(
    async () => {
      const config: AxiosRequestConfig = {
        method,
        url: `${dataRegion}${path}`,
        headers: { 'X-Tenant-ID': tenantId },
        timeout: 30_000,
      };
      if (options?.params) {
        config.params = options.params;
        // Sophos APIs expect repeated keys (severity=a&severity=b), not brackets
        config.paramsSerializer = { indexes: null };
      }
      if (options?.data !== undefined) config.data = options.data;
      const response = await ctx.client.request<T>(config);
      return response.data;
    },
    3,
    idempotent
  );
}

// ---------------------------------------------------------------------------
// Error formatting
// ---------------------------------------------------------------------------

/**
 * Sophos batch endpoints (isolation, scans) return HTTP 200 with either
 * `{ items: [...] }` on success or `{ errors: [...] }` on failure.
 * When every requested ID fails, the response has only `errors` and no `items`.
 * This helper checks for that pattern and throws so the caller sees the failure.
 */
function checkBatchErrors(
  data: { items?: unknown[]; errors?: Array<{ id?: string; errorCode?: string; errorMessage?: string }> },
  fallback: string
): void {
  const errors = data?.errors;
  if (!errors?.length) return; // no errors, or items present alongside
  const items = data?.items;
  if (items?.length) return; // partial success — return the full response as-is
  // All IDs failed
  const messages = errors
    .map((e) => `${e.id ?? 'unknown'}: ${e.errorMessage ?? e.errorCode ?? 'unknown error'}`)
    .join('; ');
  throw new Error(`${fallback}: ${messages}`);
}

function throwApiError(err: unknown, fallback: string): never {
  const axiosErr = err as AxiosError<{ error?: string; message?: string }>;
  const response = axiosErr?.response;
  if (response) {
    const { status, headers, data: body } = response;
    const detail =
      body?.error && body?.message ? `${body.error}: ${body.message}` : body?.message;
    const msg = detail ? `${detail} (HTTP ${status})` : `${fallback} (HTTP ${status})`;
    const wrapped = new Error(msg);
    // Preserve structured fields for callers that inspect the error
    (wrapped as Error & { status: number }).status = status;
    if (headers?.['retry-after']) {
      (wrapped as Error & { retryAfter: string }).retryAfter = headers['retry-after'] as string;
    }
    throw wrapped;
  }
  const original = err instanceof Error ? err.message : String(err);
  throw new Error(`${fallback}: ${original}`);
}

// ---------------------------------------------------------------------------
// Sophos Central connector spec
// ---------------------------------------------------------------------------

export const SophosCentral: ConnectorSpec = {
  metadata: {
    id: '.sophos_central',
    displayName: 'Sophos Central',
    description: i18n.translate('core.kibanaConnectorSpecs.sophosCentral.metadata.description', {
      defaultMessage:
        'Manage Sophos Central alerts, isolate and scan endpoints, maintain IOC block and allow lists, and query XDR detections',
    }),
    minimumLicense: 'enterprise',
    supportedFeatureIds: ['agentBuilder'],
  },

  auth: {
    types: [
      {
        type: 'oauth_client_credentials',
        defaults: {
          tokenUrl: 'https://id.sophos.com/api/v2/oauth2/token',
          scope: 'token',
          tokenType: 'Bearer',
        },
        overrides: {
          meta: {
            tokenUrl: { hidden: true },
            scope: { hidden: true },
            clientId: {
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.sophosCentral.auth.clientIdHelpText',
                {
                  defaultMessage:
                    'Sophos Central API client ID. Create in Sophos Central under ' +
                    'My Products > General Settings > API Credentials > Add Credential. ' +
                    'The credential needs alerts:read, alerts:action, endpoint-state:read, ' +
                    'endpoint-state:update, and detections.queries.detections:create scopes.',
                }
              ),
            },
          },
        },
      },
    ],
  },

  schema: lazySchema(() =>
    z.object({
      apiUrl: UISchemas.url('https://api.central.sophos.com')
        .max(2048)
        .meta({
          label: i18n.translate('core.kibanaConnectorSpecs.sophosCentral.config.apiUrlLabel', {
            defaultMessage: 'API URL',
          }),
          helpText: i18n.translate(
            'core.kibanaConnectorSpecs.sophosCentral.config.apiUrlHelpText',
            {
              defaultMessage:
                'Sophos Central global API base URL. The connector discovers your ' +
                'tenant ID and regional host automatically. Use the default unless ' +
                'Sophos Support instructs otherwise.',
            }
          ),
          placeholder: 'https://api.central.sophos.com',
          validate: { allowedHosts: true },
        }),
    })
  ),

  test: {
    enabled: true,
    handler: async (ctx) => {
      try {
        const { tenantId, dataRegion } = await whoami(ctx);
        return { tenantId, dataRegion };
      } catch (err) {
        throwApiError(err, 'Sophos Central connection test failed');
      }
    },
  },

  skill: [
    '## Sophos Central Connector',
    '',
    'Use this connector to respond to endpoint threats detected by Sophos Central.',
    '',
    '### Alert triage',
    '1. Call `listAlerts` to find recent high-severity alerts.',
    '2. Call `getAlert` with the alert ID to retrieve its `allowedActions`, severity, and affected endpoint.',
    '3. Call `actOnAlert` with an action from `allowedActions` (e.g. `acknowledge` or `clearThreat`) to close the alert.',
    '',
    '### Endpoint containment',
    '1. Call `listEndpoints` with `isolationStatus=notIsolated` to find endpoints that are not yet isolated.',
    '2. Call `getEndpoint` to confirm the isolation state and read health status.',
    '3. Call `isolateEndpoint` with the endpoint IDs to block network access.',
    '4. Call `scanEndpoint` to trigger an on-demand malware scan. The scan runs asynchronously.',
    '5. Call `deisolateEndpoint` only after an analyst confirms the threat is remediated.',
    '',
    '### IOC management',
    '- Call `addBlockedItem` with a SHA-256 hash to add a file to the tenant-wide block list.',
    '- Call `listBlockedItems` to audit the current block list.',
    '',
    '### Tamper protection',
    '- Call `getTamperProtection` to check whether tamper protection is enabled. A disabled state is a risk signal.',
    '',
    '### XDR detections (requires XDR licence)',
    '- Call `listDetections` to query XDR detections. The connector submits the query asynchronously, ' +
      'polls until complete (up to 90 s), and returns paginated results with a `runId`.',
    '- To fetch the next page, call `listDetections` again with the same `runId` and increment `page`. ' +
      'This reuses the original query run without resubmitting.',
    '',
    '### Pagination',
    '- `listAlerts` and `listEndpoints` use cursor pagination: pass the returned `pages.nextKey` as `pageFromKey` to get the next page.',
    '- `listBlockedItems` uses page-number pagination: increment `page` until `page > pages.total`.',
    '- `listDetections` returns a `runId`: pass it back with the desired `page` to paginate the same query run.',
  ].join('\n'),

  actions: {
    // -------------------------------------------------------------------------
    // Alert actions
    // -------------------------------------------------------------------------

    listAlerts: {
      isTool: true,
      scope: 'read',
      description:
        'List Sophos Central tenant alerts with optional filters for severity, product, ' +
        'category, and date range. Returns a cursor-paginated list. Pass `pageFromKey` from ' +
        '`pages.nextKey` to retrieve subsequent pages.',
      input: ListAlertsInputSchema,
      handler: async (ctx, input: ListAlertsInput) => {
        try {
          const params: Record<string, unknown> = {};
          if (input.severity?.length) params.severity = input.severity;
          if (input.product?.length) params.product = input.product;
          if (input.category?.length) params.category = input.category;
          if (input.from) params.from = input.from;
          if (input.to) params.to = input.to;
          if (input.pageFromKey) params.pageFromKey = input.pageFromKey;
          if (input.pageSize) params.pageSize = input.pageSize;
          return await request(ctx, 'GET', '/common/v1/alerts', { params });
        } catch (err) {
          throwApiError(err, 'Failed to list alerts');
        }
      },
    },

    getAlert: {
      isTool: true,
      scope: 'read',
      description:
        'Retrieve a single Sophos Central alert by UUID. Returns severity, category, ' +
        'managedAgent (the affected endpoint), and allowedActions (the actions currently ' +
        'permitted on this alert). Use allowedActions to pick the right value for actOnAlert.',
      input: GetAlertInputSchema,
      handler: async (ctx, input: GetAlertInput) => {
        try {
          return await request(ctx, 'GET', `/common/v1/alerts/${input.alertId}`);
        } catch (err) {
          throwApiError(err, `Failed to get alert ${input.alertId}`);
        }
      },
    },

    actOnAlert: {
      isTool: true,
      scope: 'write',
      description:
        'Apply a lifecycle action to a single Sophos Central alert. ' +
        "Check the alert's `allowedActions` field first (from getAlert) to confirm the " +
        'action is available. Available actions: acknowledge, cleanPua, cleanVirus, authPua, ' +
        'clearThreat, clearHmpa, sendMsgPua, sendMsgThreat.',
      input: ActOnAlertInputSchema,
      handler: async (ctx, input: ActOnAlertInput) => {
        try {
          return await request(ctx, 'POST', `/common/v1/alerts/${input.alertId}/actions`, {
            data: {
              action: input.action,
              ...(input.message !== undefined && { message: input.message }),
            },
            idempotent: false,
          });
        } catch (err) {
          throwApiError(err, `Failed to act on alert ${input.alertId}`);
        }
      },
    },

    actOnAlertsBulk: {
      isTool: true,
      scope: 'write',
      description:
        'Apply a single lifecycle action to multiple Sophos Central alerts. ' +
        'The connector iterates over each alert ID in turn. Partial failures are returned ' +
        'in the results array alongside successes — a non-zero failureCount does not throw. ' +
        'Rate limit: 100 calls/min — keep batches under 50 during peak hours.',
      input: ActOnAlertsBulkInputSchema,
      handler: async (ctx, input: ActOnAlertsBulkInput) => {
        // Resolve tenant and region once before iterating over IDs
        const { tenantId, dataRegion } = await whoami(ctx);
        const results: Array<{ alertId: string; status: string; error?: string }> = [];
        let successCount = 0;
        let failureCount = 0;

        for (const alertId of input.ids) {
          try {
            await withRetry(
              async () => {
                const response = await ctx.client.request({
                  method: 'POST',
                  url: `${dataRegion}/common/v1/alerts/${alertId}/actions`,
                  headers: { 'X-Tenant-ID': tenantId },
                  data: {
                    action: input.action,
                    ...(input.message !== undefined && { message: input.message }),
                  },
                  timeout: 30_000,
                });
                return response.data;
              },
              3,
              false
            );
            results.push({ alertId, status: 'success' });
            successCount++;
          } catch (err) {
            const axiosErr = err as AxiosError<{ error?: string; message?: string }>;
            const status = axiosErr?.response?.status;
            const body = axiosErr?.response?.data;
            const detail =
              body?.error && body?.message ? `${body.error}: ${body.message}` : body?.message;
            const statusText = status ? ` (HTTP ${status})` : '';
            const msg = detail
              ? `${detail}${statusText}`
              : err instanceof Error
                ? err.message
                : 'Unknown error';
            results.push({ alertId, status: 'failed', error: msg });
            failureCount++;
          }
        }

        return { results, successCount, failureCount };
      },
    },

    // -------------------------------------------------------------------------
    // Endpoint actions
    // -------------------------------------------------------------------------

    listEndpoints: {
      isTool: true,
      scope: 'read',
      description:
        'List Sophos Central endpoints with optional filters for health status, isolation ' +
        'state, and tamper protection. Returns a cursor-paginated list. Pass `pageFromKey` ' +
        'from `pages.nextKey` to retrieve subsequent pages.',
      input: ListEndpointsInputSchema,
      handler: async (ctx, input: ListEndpointsInput) => {
        try {
          const params: Record<string, unknown> = {};
          if (input.healthStatus?.length) params.healthStatus = input.healthStatus;
          if (input.isolationStatus) params.isolationStatus = input.isolationStatus;
          if (input.tamperProtectionEnabled !== undefined)
            params.tamperProtectionEnabled = input.tamperProtectionEnabled;
          if (input.hostnameContains?.trim()) params.hostnameContains = input.hostnameContains;
          if (input.pageFromKey) params.pageFromKey = input.pageFromKey;
          if (input.pageSize) params.pageSize = input.pageSize;
          return await request(ctx, 'GET', '/endpoint/v1/endpoints', { params });
        } catch (err) {
          throwApiError(err, 'Failed to list endpoints');
        }
      },
    },

    getEndpoint: {
      isTool: true,
      scope: 'read',
      description:
        'Retrieve a single Sophos Central endpoint by UUID. Returns type, hostname, ' +
        'health status, network isolation state, tamper protection state, and last-seen ' +
        'timestamp.',
      input: GetEndpointInputSchema,
      handler: async (ctx, input: GetEndpointInput) => {
        try {
          return await request(ctx, 'GET', `/endpoint/v1/endpoints/${input.endpointId}`);
        } catch (err) {
          throwApiError(err, `Failed to get endpoint ${input.endpointId}`);
        }
      },
    },

    isolateEndpoint: {
      isTool: true,
      scope: 'write',
      description:
        'Put one or more Sophos Central endpoints into network isolation. The endpoint ' +
        'retains connectivity to Sophos Central but is blocked from all other network traffic. ' +
        'Accepts 1 to 500 endpoint UUIDs. If an endpoint is already isolated the call ' +
        'succeeds silently (idempotent).',
      input: IsolateEndpointInputSchema,
      handler: async (ctx, input: IsolateEndpointInput) => {
        let result;
        try {
          result = await request<{
            items?: unknown[];
            errors?: Array<{ id?: string; errorCode?: string; errorMessage?: string }>;
          }>(ctx, 'POST', '/endpoint/v1/endpoints/isolation', {
            data: {
              enabled: true,
              ids: input.ids,
              ...(input.comment !== undefined && { comment: input.comment }),
            },
            idempotent: true,
          });
        } catch (err) {
          throwApiError(err, 'Failed to isolate endpoints');
        }
        checkBatchErrors(result, 'Failed to isolate endpoints');
        return result;
      },
    },

    deisolateEndpoint: {
      isTool: true,
      scope: 'write',
      description:
        'Remove one or more Sophos Central endpoints from network isolation, restoring ' +
        'their normal network connectivity. Accepts 1 to 500 endpoint UUIDs. If an endpoint ' +
        'is already not isolated the call succeeds silently (idempotent).',
      input: DeisolateEndpointInputSchema,
      handler: async (ctx, input: DeisolateEndpointInput) => {
        let result;
        try {
          result = await request<{
            items?: unknown[];
            errors?: Array<{ id?: string; errorCode?: string; errorMessage?: string }>;
          }>(ctx, 'POST', '/endpoint/v1/endpoints/isolation', {
            data: {
              enabled: false,
              ids: input.ids,
              ...(input.comment !== undefined && { comment: input.comment }),
            },
            idempotent: true,
          });
        } catch (err) {
          throwApiError(err, 'Failed to de-isolate endpoints');
        }
        checkBatchErrors(result, 'Failed to de-isolate endpoints');
        return result;
      },
    },

    scanEndpoint: {
      isTool: true,
      scope: 'write',
      description:
        'Trigger an on-demand malware scan on one or more Sophos Central endpoints. ' +
        'The scan runs asynchronously; the action returns a scan ID immediately after ' +
        'acceptance. Accepts 1 to 500 endpoint UUIDs.',
      input: ScanEndpointInputSchema,
      handler: async (ctx, input: ScanEndpointInput) => {
        let result;
        try {
          result = await request<{
            items?: unknown[];
            errors?: Array<{ id?: string; errorCode?: string; errorMessage?: string }>;
          }>(ctx, 'POST', '/endpoint/v1/endpoints/scans', {
            data: { ids: input.ids },
            idempotent: false,
          });
        } catch (err) {
          throwApiError(err, 'Failed to trigger endpoint scan');
        }
        checkBatchErrors(result, 'Failed to trigger endpoint scan');
        return result;
      },
    },

    getTamperProtection: {
      isTool: true,
      scope: 'read',
      description:
        'Read the tamper protection status for a Sophos Central endpoint. ' +
        'A disabled state (`enabled: false`) is a risk signal. ' +
        'The recovery password is not returned to agents.',
      input: GetTamperProtectionInputSchema,
      handler: async (ctx, input: GetTamperProtectionInput) => {
        try {
          const data = await request<Record<string, unknown>>(
            ctx,
            'GET',
            `/endpoint/v1/endpoints/${input.endpointId}/tamper-protection`
          );
          // Strip the recovery password — it is an endpoint credential
          // that must not be exposed in Agent Builder tool context.
          const { password: _password, ...safe } = data;
          return safe;
        } catch (err) {
          throwApiError(err, `Failed to get tamper protection for endpoint ${input.endpointId}`);
        }
      },
    },

    updateTamperProtection: {
      isTool: false,
      scope: 'destroy',
      description:
        'Enable or disable tamper protection for a Sophos Central endpoint. ' +
        'Optionally regenerate the recovery password. Only use this action after ' +
        'analyst approval — disabling tamper protection exposes the endpoint.',
      input: UpdateTamperProtectionInputSchema,
      handler: async (ctx, input: UpdateTamperProtectionInput) => {
        try {
          return await request(
            ctx,
            'POST',
            `/endpoint/v1/endpoints/${input.endpointId}/tamper-protection`,
            {
              data: {
                enabled: input.enabled,
                ...(input.regeneratePassword !== undefined && {
                  regeneratePassword: input.regeneratePassword,
                }),
              },
              idempotent: false,
            }
          );
        } catch (err) {
          throwApiError(err, `Failed to update tamper protection for endpoint ${input.endpointId}`);
        }
      },
    },

    // -------------------------------------------------------------------------
    // Blocklist / allowlist actions
    // -------------------------------------------------------------------------

    listBlockedItems: {
      isTool: true,
      scope: 'read',
      description:
        "List the items on the Sophos Central tenant's global blocked list. " +
        'Returns a page-numbered list of blocked items. Increment `page` until ' +
        '`page > pages.total` to retrieve all pages.',
      input: ListBlockedItemsInputSchema,
      handler: async (ctx, input: ListBlockedItemsInput) => {
        try {
          const params: Record<string, unknown> = {};
          if (input.page) params.page = input.page;
          if (input.pageSize) params.pageSize = input.pageSize;
          return await request(ctx, 'GET', '/endpoint/v1/settings/blocked-items', { params });
        } catch (err) {
          throwApiError(err, 'Failed to list blocked items');
        }
      },
    },

    addBlockedItem: {
      isTool: true,
      scope: 'write',
      description:
        "Add a SHA-256 file hash to the Sophos Central tenant's global blocked list. " +
        'Only SHA-256 hashes are supported for the blocked list. If the hash is already ' +
        'blocked the action returns the existing item (soft success, no error).',
      input: AddBlockedItemInputSchema,
      handler: async (ctx, input: AddBlockedItemInput) => {
        try {
          return await request(ctx, 'POST', '/endpoint/v1/settings/blocked-items', {
            data: {
              type: 'sha256',
              properties: { sha256: input.sha256 },
              ...(input.comment !== undefined && { comment: input.comment }),
            },
            idempotent: false,
          });
        } catch (err) {
          const status = (err as AxiosError)?.response?.status;
          if (status === 409) {
            // Already on the blocked list — treat as soft success.
            return { alreadyBlocked: true, sha256: input.sha256 };
          }
          throwApiError(err, `Failed to add blocked item for hash ${input.sha256}`);
        }
      },
    },

    addAllowedItem: {
      isTool: false,
      scope: 'write',
      description:
        "Add an item to the Sophos Central tenant's global allowed list. " +
        'Supported types: `path`, `sha256`, `certificateSigner`, `posixPath`. ' +
        'Provide matching properties for the type (e.g. `{path: "/usr/bin/example"}`). ' +
        'If the item is already allowed the action returns a soft success (no error).',
      input: AddAllowedItemInputSchema,
      handler: async (ctx, input: AddAllowedItemInput) => {
        try {
          return await request(ctx, 'POST', '/endpoint/v1/settings/allowed-items', {
            data: {
              type: input.type,
              properties: input.properties,
              ...(input.comment !== undefined && { comment: input.comment }),
            },
            idempotent: false,
          });
        } catch (err) {
          const status = (err as AxiosError)?.response?.status;
          if (status === 409) {
            return { alreadyAllowed: true, type: input.type };
          }
          throwApiError(err, `Failed to add allowed item (type: ${input.type})`);
        }
      },
    },

    deleteBlockedItem: {
      isTool: false,
      scope: 'destroy',
      description:
        "Remove a blocked item from the Sophos Central tenant's global blocked list " +
        'by its item ID. Use `listBlockedItems` to find the ID. Deletion is permanent.',
      input: DeleteBlockedItemInputSchema,
      handler: async (ctx, input: DeleteBlockedItemInput) => {
        try {
          return await request(
            ctx,
            'DELETE',
            `/endpoint/v1/settings/blocked-items/${encodeURIComponent(input.blockedItemId)}`,
            { idempotent: false }
          );
        } catch (err) {
          throwApiError(err, `Failed to delete blocked item ${input.blockedItemId}`);
        }
      },
    },

    // -------------------------------------------------------------------------
    // Detections (async 2-step)
    // -------------------------------------------------------------------------

    listDetections: {
      isTool: true,
      scope: 'read',
      description:
        'Query XDR detections for the Sophos Central tenant (requires XDR licence). ' +
        'On the first call the connector submits the query, polls until it completes ' +
        '(up to 90 s), and returns the first page of results along with `runId`. ' +
        'To fetch subsequent pages, pass the same `runId` with the desired `page` — ' +
        'the connector skips submission and returns results directly.',
      input: ListDetectionsInputSchema,
      handler: async (ctx, input: ListDetectionsInput) => {
        const { tenantId, dataRegion } = await whoami(ctx);
        const headers = { 'X-Tenant-ID': tenantId };

        let runId = input.runId;

        if (!runId) {
          // Step 1: submit the detection query
          const submitRes = await ctx.client.request<{
            id?: string;
            runId?: string;
            result?: string;
          }>({
            method: 'POST',
            url: `${dataRegion}/detections/v1/queries/detections`,
            headers,
            data: {
              ...(input.severity?.length && { severity: input.severity }),
              ...(input.type?.length && { type: input.type }),
              ...(input.category?.length && { category: input.category }),
              ...(input.from && { from: input.from }),
              ...(input.to && { to: input.to }),
            },
            timeout: 30_000,
          });

          runId = submitRes.data?.id ?? submitRes.data?.runId;
          if (!runId) {
            throw new Error('Sophos Central listDetections: submit did not return a query id');
          }

          // If the submit itself already reports a terminal state, check it now
          const submitResult = submitRes.data?.result;
          if (submitResult === 'notAvailable') {
            throw new Error(
              'Sophos Central listDetections: XDR detections are not available for this tenant. ' +
                'An XDR licence is required.'
            );
          }

          // Step 2: poll until terminal state
          const TERMINAL = new Set([
            'succeeded',
            'canceled',
            'failed',
            'notAvailable',
            'timedOut',
          ]);
          const pollTimeoutMs = 90_000;
          const pollIntervalMs = 5_000;
          const deadline = Date.now() + pollTimeoutMs;

          let runState = '';
          while (!TERMINAL.has(runState)) {
            const remaining = deadline - Date.now();
            if (remaining <= 0) {
              throw new Error(
                'Sophos Central listDetections: query run did not complete within 90 seconds'
              );
            }
            await sleep(Math.min(pollIntervalMs, remaining));
            if (Date.now() > deadline) {
              throw new Error(
                'Sophos Central listDetections: query run did not complete within 90 seconds'
              );
            }
            const pollRes = await ctx.client.request<{ result?: string; status?: string }>({
              method: 'GET',
              url: `${dataRegion}/detections/v1/queries/detections/${runId}`,
              headers,
              timeout: Math.min(30_000, Math.max(1_000, deadline - Date.now())),
            });
            runState = pollRes.data?.result ?? pollRes.data?.status ?? '';
          }

          if (runState !== 'succeeded') {
            throw new Error(
              `Sophos Central listDetections: query run ended with state "${runState}"`
            );
          }
        }

        // Step 3: retrieve results page
        const resultsRes = await ctx.client.request({
          method: 'GET',
          url: `${dataRegion}/detections/v1/queries/detections/${runId}/results`,
          headers,
          params: {
            page: input.page ?? 1,
            pageSize: input.pageSize ?? 50,
          },
          timeout: 30_000,
        });

        return { ...resultsRes.data, runId };
      },
    },
  },
};
