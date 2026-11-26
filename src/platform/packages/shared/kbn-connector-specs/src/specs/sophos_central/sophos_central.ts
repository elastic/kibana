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
 * Regional routing: GET https://api.central.sophos.com/whoami/v1 → tenantId + regional base URL.
 * Every action call uses the regional base URL with X-Tenant-ID header.
 *
 * https://developer.sophos.com
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { AxiosError, AxiosRequestConfig } from 'axios';
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
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
// Constants
// ---------------------------------------------------------------------------

const GLOBAL_API_URL = 'https://api.central.sophos.com';
const REGIONAL_URL_RE = /^https:\/\/api(-[a-z0-9]+)?\.central\.sophos\.com$/;

// ---------------------------------------------------------------------------
// Whoami discovery (called once per action to resolve tenant + regional host)
// ---------------------------------------------------------------------------

interface WhoamiResult {
  tenantId: string;
  dataRegion: string;
}

async function whoami(ctx: ActionContext): Promise<WhoamiResult> {
  const response = await ctx.client.get(`${GLOBAL_API_URL}/whoami/v1`, { timeout: 10_000 });
  const data = response.data as {
    id?: string;
    idType?: string;
    apiHosts?: { dataRegion?: string };
  };
  const tenantId = data?.id;
  const dataRegion = data?.apiHosts?.dataRegion?.replace(/\/+$/, '');
  if (!tenantId || !dataRegion) {
    throw new Error(
      'Sophos Central whoami response is missing tenantId or dataRegion. ' +
        'Confirm the credentials are correct.'
    );
  }
  if (data?.idType !== 'tenant') {
    throw new Error(
      `Sophos Central requires tenant-level credentials but whoami returned idType "${
        data?.idType ?? 'missing'
      }". ` + 'Please use a tenant API credential, not a partner or organization credential.'
    );
  }
  if (!REGIONAL_URL_RE.test(dataRegion)) {
    throw new Error(
      `Sophos Central whoami returned an unexpected regional URL: ${dataRegion}. ` +
        'Expected https://api-<region>.central.sophos.com.'
    );
  }
  return { tenantId, dataRegion };
}

// ---------------------------------------------------------------------------
// Request helper (no retry — errors go straight through throwApiError)
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request<T = unknown>(
  ctx: ActionContext,
  method: string,
  path: string,
  options?: {
    params?: Record<string, unknown>;
    data?: unknown;
    tenantId?: string;
    dataRegion?: string;
    timeout?: number;
  }
): Promise<T> {
  let tenantId = options?.tenantId;
  let dataRegion = options?.dataRegion;
  if (!tenantId || !dataRegion) {
    const resolved = await whoami(ctx);
    tenantId = resolved.tenantId;
    dataRegion = resolved.dataRegion;
  }
  const config: AxiosRequestConfig = {
    method,
    url: `${dataRegion}${path}`,
    headers: { 'X-Tenant-ID': tenantId },
    timeout: options?.timeout ?? ctx.client.defaults?.timeout ?? 30_000,
  };
  if (options?.params) {
    // Sophos uses OpenAPI style:form, explode:false — arrays are comma-joined
    // (severity=high,medium), not repeated keys or bracketed keys.
    const flatParams: Record<string, string | number | boolean> = {};
    for (const [key, value] of Object.entries(options.params)) {
      flatParams[key] = Array.isArray(value)
        ? value.join(',')
        : (value as string | number | boolean);
    }
    config.params = flatParams;
  }
  if (options?.data !== undefined) config.data = options.data;
  const response = await ctx.client.request<T>(config);
  return response.data;
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
  data: {
    items?: unknown[];
    errors?: Array<{ id?: string; errorCode?: string; errorMessage?: string }>;
  },
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

function throwApiError(err: unknown, fallback: string, meta?: Record<string, unknown>): never {
  const axiosErr = err as AxiosError<{ error?: string; message?: string }>;
  const response = axiosErr?.response;
  if (response) {
    const { status, headers, data: body } = response;
    const detail = body?.error && body?.message ? `${body.error}: ${body.message}` : body?.message;
    const msg = detail ? `${detail} (HTTP ${status})` : `${fallback} (HTTP ${status})`;
    const wrapped = new Error(msg);
    // Preserve response so the Actions executor can read HTTP status and retry headers.
    // The executor reads error.response (AxiosError shape), not top-level status / retryAfter.
    (wrapped as Error & { response: typeof response }).response = response;
    (wrapped as Error & { status: number }).status = status;
    if (headers?.['retry-after']) {
      (wrapped as Error & { retryAfter: string }).retryAfter = headers['retry-after'] as string;
    }
    if (meta) Object.assign(wrapped, meta);
    throw wrapped;
  }
  const original = err instanceof Error ? err.message : String(err);
  const newErr = new Error(`${fallback}: ${original}`);
  if (meta) Object.assign(newErr, meta);
  throw newErr;
}

// ---------------------------------------------------------------------------
// Detection run polling helper
// ---------------------------------------------------------------------------

/**
 * Polls a Sophos detection run until it reaches a terminal state.
 *
 * Returns the terminal state string ('succeeded', 'failed', etc.) on completion.
 * Returns `{ runId, state: 'pending' }` if the 90-second client-side budget expires
 * before the run reaches a terminal state — the caller may pass the same runId back
 * to resume polling. 'pending' is a client-side budget marker; it differs from the
 * Sophos server-side 'timedOut' state, which the run can also reach on its own and
 * which causes a thrown error.
 *
 * skipInitialSleep: when true, the first poll fires immediately (used for the
 * continuation path where the run is likely already complete).
 */
interface DetectionPollPending {
  runId: string;
  state: 'pending';
}

async function pollDetectionRunToCompletion(
  ctx: ActionContext,
  runId: string,
  tenantId: string,
  dataRegion: string,
  skipInitialSleep = false
): Promise<string | DetectionPollPending> {
  const TERMINAL = new Set(['succeeded', 'canceled', 'failed', 'notAvailable', 'timedOut']);
  const pollTimeoutMs = 90_000;
  const pollIntervalMs = 5_000;
  // Minimum remaining budget required to attempt a poll request.
  // Prevents passing timeout: 0 to Axios (which means "no timeout") and avoids
  // raw "timeout of Nms exceeded" Axios errors from a 1-few ms budget.
  const MIN_POLL_TIMEOUT_MS = 500;
  const deadline = Date.now() + pollTimeoutMs;
  // Treat client timeout 0 (Axios "disabled" / xpack.actions.responseTimeout: 0ms) as no cap.
  // A zero client timeout makes Math.min(0, afterSleep) = 0, disabling the Axios timer and
  // letting a stalled request outlive the 90-second poll budget.
  const clientCap = ctx.client.defaults?.timeout || undefined;

  let runState = '';
  let isFirstIter = true;

  while (!TERMINAL.has(runState)) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) return { runId, state: 'pending' };

    if (!isFirstIter || !skipInitialSleep) {
      await sleep(Math.min(pollIntervalMs, remaining));
    }
    isFirstIter = false;

    const afterSleep = deadline - Date.now();
    if (afterSleep < MIN_POLL_TIMEOUT_MS) return { runId, state: 'pending' };

    // effectiveTimeout: use the smaller of the client cap and the remaining budget.
    // isBudgetLimited: true when afterSleep is the binding constraint — an Axios timeout
    // in that case means the poll budget expired mid-request, which should be treated as
    // pending rather than an error. When clientCap is the binding constraint (Kibana's
    // responseTimeout is shorter than the remaining budget), a timeout is a real error.
    const effectiveTimeout = clientCap !== undefined ? Math.min(clientCap, afterSleep) : afterSleep;
    const isBudgetLimited = effectiveTimeout === afterSleep;

    try {
      const pollRes = await request<{ result?: string; status?: string }>(
        ctx,
        'GET',
        `/detections/v1/queries/detections/${encodeURIComponent(runId)}`,
        { tenantId, dataRegion, timeout: effectiveTimeout }
      );
      runState = pollRes?.result ?? pollRes?.status ?? '';
    } catch (err) {
      // An Axios request timeout (ECONNABORTED) when the timeout was budget-limited means
      // the 90-second poll budget expired during the request itself. Return pending so the
      // caller can resume with the same runId rather than seeing a network error.
      if ((err as AxiosError)?.code === 'ECONNABORTED' && isBudgetLimited) {
        return { runId, state: 'pending' };
      }
      // All other errors (HTTP 4xx/5xx, connection failure, Kibana responseTimeout):
      // attach runId so Agent Builder can tell the caller to resume this run rather than
      // starting a new query from scratch.
      throwApiError(err, `Sophos Central listDetections: failed to poll run ${runId}`, { runId });
    }
  }

  return runState;
}

// ---------------------------------------------------------------------------
// Sophos Central connector spec
// ---------------------------------------------------------------------------

export const SophosCentral: ConnectorSpec = {
  metadata: {
    id: '.sophos_central',
    displayName: 'Sophos Central',
    description: i18n.translate('connectorSpecs.sophosCentral.metadata.description', {
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
              helpText: i18n.translate('connectorSpecs.sophosCentral.auth.clientIdHelpText', {
                defaultMessage:
                  'Sophos Central API client ID. Create in Sophos Central under ' +
                  'My Products > General Settings > API Credentials Management > Add Credential. ' +
                  'No scope or role selection is required; the credential inherits full API access ' +
                  "from the creating admin's role. Only tenant-level credentials are supported.",
              }),
            },
          },
        },
      },
    ],
  },

  schema: lazySchema(() => z.object({})),

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
    "1. Call `getEndpoint` to confirm the endpoint's isolation state and health status.",
    '2. Call `isolateEndpoint` with the endpoint IDs to block network access.',
    '3. Call `scanEndpoint` to trigger an on-demand malware scan. The scan runs asynchronously.',
    '4. To restore connectivity, hand off to an analyst — `deisolateEndpoint` is not available to agents.',
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
      'polls until complete (up to 90 s), and returns paginated results with a `runId`. ' +
      'If the 90-second poll budget expires, the connector returns `{ runId, state: "pending" }` — ' +
      'pass that `runId` back to resume polling once the run completes.',
    '- To fetch the next page, call `listDetections` again with the same `runId` and increment `page`. ' +
      'The connector checks the run is complete before fetching results.',
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
        'action is available. Available actions: acknowledge, cleanPua, cleanVirus, ' +
        'clearThreat, clearHmpa, sendMsgPua, sendMsgThreat.',
      input: ActOnAlertInputSchema,
      handler: async (ctx, input: ActOnAlertInput) => {
        try {
          return await request(ctx, 'POST', `/common/v1/alerts/${input.alertId}/actions`, {
            data: {
              action: input.action,
              ...(input.message !== undefined && { message: input.message }),
            },
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
        'The connector iterates over each alert ID in turn and returns, per alert, ' +
        'the lifecycle status ("requested", "started", or "completed") and the optional outcome ' +
        'result (e.g. "success", "notNeeded", "alreadyDone") from Sophos. ' +
        'result is optional and may be absent on any row — use status, not the presence of result, ' +
        'to identify pending actions. ' +
        'A failed request produces status "failed" with an error string instead of a result. ' +
        'acceptedCount is the number of HTTP 2xx responses; it does not mean every alert was remediated. ' +
        'status "completed" with result "success" means Sophos carried out the requested action — ' +
        'it does not mean the threat was eliminated. ' +
        'For example, "acknowledge" and "sendMsgThreat" can return both values without removing the threat. ' +
        'Partial failures are returned alongside successes — a non-zero failureCount does not throw. ' +
        'Rate limit: 100 calls/min — keep batches under 50 during peak hours.',
      input: ActOnAlertsBulkInputSchema,
      handler: async (ctx, input: ActOnAlertsBulkInput) => {
        // Resolve tenant and region once before iterating over IDs
        const { tenantId, dataRegion } = await whoami(ctx);
        const results: Array<{ alertId: string; status: string; result?: string; error?: string }> =
          [];
        let acceptedCount = 0;
        let failureCount = 0;

        for (const alertId of input.ids) {
          try {
            // Capture the Sophos response so its `status` (lifecycle) and `result` (outcome)
            // fields are both forwarded. Sophos returns HTTP 201 with status "requested" or
            // "started" while the action is still being processed, and "completed" only once it
            // finishes. `result` (e.g. "success", "notNeeded") describes the actual outcome and
            // must be preserved — an alert with status "completed" and result "notNeeded" was
            // not remediated. Discarding the response and reporting "success" would make an
            // unsuccessful completion indistinguishable from successful remediation.
            const res = await request<{ status?: string; result?: string }>(
              ctx,
              'POST',
              `/common/v1/alerts/${alertId}/actions`,
              {
                tenantId,
                dataRegion,
                data: {
                  action: input.action,
                  ...(input.message !== undefined && { message: input.message }),
                },
              }
            );
            results.push({
              alertId,
              status: res?.status ?? 'accepted',
              ...(res?.result !== undefined && { result: res.result }),
            });
            acceptedCount++;
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

        return { results, acceptedCount, failureCount };
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
          });
        } catch (err) {
          throwApiError(err, 'Failed to isolate endpoints');
        }
        checkBatchErrors(result, 'Failed to isolate endpoints');
        return result;
      },
    },

    deisolateEndpoint: {
      isTool: false,
      scope: 'write',
      description:
        'Remove one or more Sophos Central endpoints from network isolation, restoring ' +
        'their normal network connectivity. Accepts 1 to 500 endpoint UUIDs. If an endpoint ' +
        'is already not isolated the call succeeds silently (idempotent). ' +
        'Requires analyst confirmation before use.',
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
        'The scan runs asynchronously. The response contains per-endpoint results — ' +
        'accepted endpoint IDs and any per-endpoint errors. ' +
        'There is no single scan identifier. Accepts 1 to 500 endpoint UUIDs.',
      input: ScanEndpointInputSchema,
      handler: async (ctx, input: ScanEndpointInput) => {
        let result;
        try {
          result = await request<{
            items?: unknown[];
            errors?: Array<{ id?: string; errorCode?: string; errorMessage?: string }>;
          }>(ctx, 'POST', '/endpoint/v1/endpoints/scans', {
            data: { ids: input.ids },
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
        'Returns only the enabled flag — passwords are never exposed.',
      input: GetTamperProtectionInputSchema,
      handler: async (ctx, input: GetTamperProtectionInput) => {
        try {
          const data = await request<Record<string, unknown>>(
            ctx,
            'GET',
            `/endpoint/v1/endpoints/${input.endpointId}/tamper-protection`
          );
          // Return only the enabled flag — the response contains password
          // and previousPasswords which must not be exposed to agents.
          return { enabled: data.enabled };
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
          const data = await request<Record<string, unknown>>(
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
            }
          );
          // Return only the enabled flag — the response contains password
          // and previousPasswords which must not be exposed to callers.
          return { enabled: data.enabled };
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
          const params: Record<string, unknown> = { pageTotal: true };
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
              comment: input.comment,
            },
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
              comment: input.comment,
            },
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
            `/endpoint/v1/settings/blocked-items/${encodeURIComponent(input.blockedItemId)}`
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
        'If the 90-second poll budget expires before the run completes, the connector ' +
        'returns `{ runId, state: "pending" }` instead of results — pass that `runId` ' +
        'back to resume polling and retrieve results once the run finishes. ' +
        'To fetch subsequent pages, pass the same `runId` with the desired `page` and ' +
        'the same `pageSize` used on the first call — the connector checks the run is ' +
        'complete before fetching results.',
      input: ListDetectionsInputSchema,
      handler: async (ctx, input: ListDetectionsInput) => {
        const { tenantId, dataRegion } = await whoami(ctx);

        let runId = input.runId;

        if (!runId) {
          // Step 1: submit the detection query
          let submitRes: { id?: string; runId?: string; result?: string } | undefined;
          try {
            submitRes = await request<{
              id?: string;
              runId?: string;
              result?: string;
            }>(ctx, 'POST', '/detections/v1/queries/detections', {
              tenantId,
              dataRegion,
              data: {
                ...(input.severity?.length && { severity: input.severity }),
                ...(input.type?.length && { type: input.type }),
                ...(input.category?.length && { category: input.category }),
                ...(input.from && { from: input.from }),
                ...(input.to && { to: input.to }),
              },
            });
          } catch (err) {
            throwApiError(err, 'Sophos Central listDetections: failed to submit detection query');
          }

          runId = submitRes?.id ?? submitRes?.runId;
          if (!runId) {
            throw new Error('Sophos Central listDetections: submit did not return a query id');
          }

          // If the submit itself already reports a terminal state, check it now
          const submitResult = submitRes?.result;
          if (submitResult === 'notAvailable') {
            throw new Error(
              'Sophos Central listDetections: XDR detections are not available for this tenant. ' +
                'An XDR licence is required.'
            );
          }

          // Step 2: poll until terminal state (sleeps before the first probe)
          const pollResult = await pollDetectionRunToCompletion(ctx, runId, tenantId, dataRegion);
          if (typeof pollResult !== 'string') {
            // Client-side budget expired; return pending so the caller can resume with the same runId
            return pollResult;
          }
          if (pollResult !== 'succeeded') {
            throw new Error(
              `Sophos Central listDetections: query run ended with state "${pollResult}"`
            );
          }
        } else {
          // Continuation path: the caller is either paginating a completed run or resuming after a
          // pending timeout. Poll to confirm the run is in a succeeded state before fetching results
          // (skips the initial sleep — the run is likely already complete for the pagination case).
          const pollResult = await pollDetectionRunToCompletion(
            ctx,
            runId,
            tenantId,
            dataRegion,
            true // skipInitialSleep
          );
          if (typeof pollResult !== 'string') {
            return pollResult;
          }
          if (pollResult !== 'succeeded') {
            throw new Error(
              `Sophos Central listDetections: query run ended with state "${pollResult}"`
            );
          }
        }

        // Step 3: retrieve results page
        let resultsData: unknown;
        try {
          resultsData = await request(
            ctx,
            'GET',
            `/detections/v1/queries/detections/${encodeURIComponent(runId)}/results`,
            {
              tenantId,
              dataRegion,
              params: {
                page: input.page ?? 1,
                pageSize: input.pageSize ?? 50,
              },
            }
          );
        } catch (err) {
          // Attach runId so the caller knows to resume with this runId rather than resubmit.
          throwApiError(
            err,
            `Sophos Central listDetections: failed to fetch results for run ${runId}`,
            { runId }
          );
        }

        return { ...(resultsData as Record<string, unknown>), runId };
      },
    },
  },
};
