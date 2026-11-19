/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isAxiosError } from 'axios';
import type { Method } from 'axios';
import type { ActionContext } from '../../connector_spec';
import { DEFAULT_TOP } from './types';
import type { ListInput } from './types';

/** The pending machine action that blocked a new one, as getActions returns it. */
export interface ConflictingMachineAction {
  id?: string;
  type?: string;
  status?: string;
  requestor?: string;
  creationDateTimeUtc?: string;
}

/** An error from the Defender for Endpoint API, with its HTTP status and vendor error code. */
export class MdeApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: string,
    /** For a pending-action conflict: the machine action that blocked the request, if found. */
    public readonly conflictingAction?: ConflictingMachineAction
  ) {
    super(message);
    this.name = 'MdeApiError';
  }
}

/**
 * True for the API's documented "not found" answer: HTTP 404 with error code ResourceNotFound. A 404
 * without it (for example a wrong API URL path) is not a "not found" result and must stay an error.
 */
export const isResourceNotFound = (error: unknown): boolean =>
  error instanceof MdeApiError && error.status === 404 && error.code === 'ResourceNotFound';

/**
 * Defender clouds and the hosts each one uses. The API host is used unless the connector sets a
 * custom API URL. The token is requested by the auth type with the token URL and scope the user
 * entered, so those cannot be derived here: `getCloudConsistencyError` checks them against the
 * selected cloud instead, before every API request (and so before any token request), so a mismatch
 * fails with a clear message and no credential is sent to another cloud's login host.
 * Sources: Microsoft "Supported Defender for Endpoint APIs" (regional hosts) and "Microsoft
 * Defender for Endpoint for US Government customers" (GCC, GCC High, DoD hosts). Microsoft does
 * not document the US Government token audience; `<API host>/.default` is the expected value.
 */
export const MDE_CLOUDS = {
  commercial: {
    // Microsoft's current global endpoint; api.securitycenter.microsoft.com still answers too.
    apiUrl: 'https://api.security.microsoft.com/api',
    loginHost: 'login.microsoftonline.com',
    scope: 'https://api.securitycenter.microsoft.com/.default',
  },
  'commercial-us': {
    apiUrl: 'https://us.api.security.microsoft.com/api',
    loginHost: 'login.microsoftonline.com',
    scope: 'https://api.securitycenter.microsoft.com/.default',
  },
  'commercial-eu': {
    apiUrl: 'https://eu.api.security.microsoft.com/api',
    loginHost: 'login.microsoftonline.com',
    scope: 'https://api.securitycenter.microsoft.com/.default',
  },
  'commercial-uk': {
    apiUrl: 'https://uk.api.security.microsoft.com/api',
    loginHost: 'login.microsoftonline.com',
    scope: 'https://api.securitycenter.microsoft.com/.default',
  },
  'commercial-au': {
    apiUrl: 'https://au.api.security.microsoft.com/api',
    loginHost: 'login.microsoftonline.com',
    scope: 'https://api.securitycenter.microsoft.com/.default',
  },
  'commercial-swa': {
    apiUrl: 'https://swa.api.security.microsoft.com/api',
    loginHost: 'login.microsoftonline.com',
    scope: 'https://api.securitycenter.microsoft.com/.default',
  },
  'commercial-ina': {
    apiUrl: 'https://ina.api.security.microsoft.com/api',
    loginHost: 'login.microsoftonline.com',
    scope: 'https://api.securitycenter.microsoft.com/.default',
  },
  'commercial-aea': {
    apiUrl: 'https://aea.api.security.microsoft.com/api',
    loginHost: 'login.microsoftonline.com',
    scope: 'https://api.securitycenter.microsoft.com/.default',
  },
  gcc: {
    apiUrl: 'https://api-gcc.securitycenter.microsoft.us/api',
    loginHost: 'login.microsoftonline.com',
    scope: 'https://api-gcc.securitycenter.microsoft.us/.default',
  },
  'gcc-high': {
    apiUrl: 'https://api-gov.securitycenter.microsoft.us/api',
    loginHost: 'login.microsoftonline.us',
    scope: 'https://api-gov.securitycenter.microsoft.us/.default',
  },
  dod: {
    apiUrl: 'https://api-gov.securitycenter.microsoft.us/api',
    loginHost: 'login.microsoftonline.us',
    scope: 'https://api-gov.securitycenter.microsoft.us/.default',
  },
} as const;

export type MdeCloud = keyof typeof MDE_CLOUDS;
export const MDE_CLOUD_IDS = Object.keys(MDE_CLOUDS) as [MdeCloud, ...MdeCloud[]];
export const DEFAULT_CLOUD: MdeCloud = 'commercial';
export const DEFAULT_API_URL = MDE_CLOUDS.commercial.apiUrl;
export const COMMERCIAL_SCOPE = MDE_CLOUDS.commercial.scope;

/** Which family of clouds a known Microsoft host belongs to; undefined for any other host. */
type CloudFamily = 'commercial' | 'gcc' | 'gov';
const cloudFamily = (cloud: MdeCloud): CloudFamily =>
  cloud === 'gcc' ? 'gcc' : cloud === 'gcc-high' || cloud === 'dod' ? 'gov' : 'commercial';

const apiHostFamily = (host: string): CloudFamily | undefined => {
  if (host === 'api-gcc.securitycenter.microsoft.us' || host === 'api-gcc.security.microsoft.us') {
    return 'gcc';
  }
  if (host === 'api-gov.securitycenter.microsoft.us' || host === 'api-gov.security.microsoft.us') {
    return 'gov';
  }
  if (
    /^(?:[a-z]+\.)?api\.security\.microsoft\.com$/.test(host) ||
    /^api(?:-[a-z]+)?\.securitycenter\.microsoft\.com$/.test(host)
  ) {
    return 'commercial';
  }
  return undefined;
};

const hostOf = (url: unknown): string | undefined => {
  if (typeof url !== 'string') {
    return undefined;
  }
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return undefined;
  }
};

/** Hosts a custom API URL may reach over plain http: a proxy on the same host only. */
const LOOPBACK_HOSTS: ReadonlySet<string> = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * Whether a custom API URL is safe to send the bearer token to: https, or http to a loopback host.
 * Unparseable values pass here; the config schema rejects them as URLs.
 */
export const isSecureApiUrl = (url: string): boolean => {
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === 'https:' || (protocol === 'http:' && LOOPBACK_HOSTS.has(hostname));
  } catch {
    return true;
  }
};

export const INSECURE_API_URL_MESSAGE =
  'The custom API URL must use https (http is accepted only for localhost), because every request carries the access token.';

type ConnectorFields = Record<string, unknown> | undefined;

const cloudOf = (config: ConnectorFields): MdeCloud => {
  const cloud = config?.cloud;
  return typeof cloud === 'string' && cloud in MDE_CLOUDS ? (cloud as MdeCloud) : DEFAULT_CLOUD;
};

export const getCloud = (ctx: ActionContext): MdeCloud => cloudOf(ctx.config);

/**
 * Returns why the token URL, the token scope or a custom API URL belongs to a different Defender
 * cloud than the one selected, or null when they match. Only known Microsoft hosts are compared, so
 * a proxy in the API URL or token URL is accepted. `mdeRequest` calls it before
 * every API request, so before the auth type requests a token and the client secret or assertion
 * never goes to a login host of another cloud. The message names the values the selected cloud
 * expects and never echoes a secrets field.
 */
export const getCloudConsistencyError = (
  config: ConnectorFields,
  secrets: ConnectorFields
): string | null => {
  const cloud = cloudOf(config);
  const family = cloudFamily(cloud);
  const expected = MDE_CLOUDS[cloud];
  const problems: string[] = [];

  const rawApiUrl = config?.apiUrl;
  const apiHost = hostOf(typeof rawApiUrl === 'string' ? rawApiUrl.trim() : undefined);
  const apiFamily = apiHost ? apiHostFamily(apiHost) : undefined;
  if (apiFamily && apiFamily !== family) {
    problems.push(`the API URL host ${apiHost} belongs to another cloud`);
  }

  const tokenHost = hostOf(secrets?.tokenUrl);
  const isMicrosoftLogin =
    tokenHost === 'login.microsoftonline.com' || tokenHost === 'login.microsoftonline.us';
  if (isMicrosoftLogin && tokenHost !== expected.loginHost) {
    problems.push(
      `the token URL must be https://${expected.loginHost}/<tenant ID>/oauth2/v2.0/token`
    );
  }

  const scope = secrets?.scope;
  const scopeHost = hostOf(scope);
  const scopeFamily = scopeHost ? apiHostFamily(scopeHost) : undefined;
  if (scopeFamily && scopeFamily !== family) {
    problems.push(`the token scope must be ${expected.scope}`);
  }

  return problems.length > 0
    ? `The connector's Defender cloud is "${cloud}", but ${problems.join(
        '; '
      )}. Edit the connector so the cloud, the token URL, and the scope match.`
    : null;
};

/** Throws the `getCloudConsistencyError` message when the cloud does not match. */
export const assertCloudConsistency = (ctx: ActionContext): void => {
  const error = getCloudConsistencyError(ctx.config, ctx.secrets);
  if (error) {
    throw new MdeApiError(error);
  }
};

/**
 * Throws before any request when the custom API URL would send the access token over plain http,
 * which also covers connectors saved before the config schema enforced https.
 */
const assertSecureApiUrl = (ctx: ActionContext): void => {
  const configured = ctx.config?.apiUrl;
  if (typeof configured === 'string' && configured.trim() && !isSecureApiUrl(configured.trim())) {
    throw new MdeApiError(INSECURE_API_URL_MESSAGE);
  }
};

/** Attempts per request, the first one included. */
export const MAX_ATTEMPTS = 4;
/**
 * Longest total time one call spends waiting between attempts (a single Retry-After included). A
 * wait that would go past it fails the call at once with the rate-limit error instead. 30 s keeps
 * a rate-limited action short enough for an agent turn or a workflow step, and well under the
 * 210 s advanced hunting request timeout; the 5xx back-off (1 + 2 + 4 s) always fits.
 */
export const MAX_TOTAL_RETRY_WAIT_MS = 30_000;
const INITIAL_BACKOFF_MS = 1_000;
const RETRYABLE_SERVER_ERRORS = new Set([500, 502, 503, 504]);

/** Indirection so tests can skip the real waits. */
export const retryTiming = {
  sleep: (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms)),
};

export interface MdeRequestOptions {
  method: Method;
  /** Path relative to the configured API URL, starting with "/". Every interpolated value must already be encoded. */
  path: string;
  params?: Record<string, string | number | boolean | undefined>;
  data?: unknown;
  /** Application permission the call needs; named in the error when the API answers 403. */
  permission: string;
  /**
   * Whether a 5xx may be retried. GET is always idempotent. A POST that starts a machine action,
   * runs live response or submits an indicator must not be: a retry could run it twice.
   */
  idempotent?: boolean;
  timeout?: number;
}

interface MdeErrorBody {
  error?: { code?: string; message?: string; target?: string };
}

/** The custom API URL when one is set, otherwise the selected cloud's API host. */
export const getApiUrl = (ctx: ActionContext): string => {
  const configured = (ctx.config?.apiUrl as string | undefined)?.trim();
  return (configured || MDE_CLOUDS[getCloud(ctx)].apiUrl).replace(/\/+$/, '');
};

/** Seconds (or an HTTP date) from a Retry-After header, as milliseconds. */
export const parseRetryAfter = (value: unknown): number | undefined => {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return undefined;
  }
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000;
  }
  const date = Date.parse(String(value));
  return Number.isNaN(date) ? undefined : Math.max(0, date - Date.now());
};

/**
 * The API answers a machine action that collides with a pending one with HTTP 400 in one of these
 * forms: the code ActiveRequestAlreadyExists (live response); the message "Cannot isolate device
 * because Isolate action: <id> is still active." (code BadRequest, for isolate and unisolate); or
 * "Action is already in progress" / "pending machine action" (documented for the other actions).
 * Only the "still active" form names the pending action.
 */
const CONFLICT_MESSAGE = /already in progress|pending machine action|is still active/i;
const isConflictBody = (status: number, body: MdeErrorBody | undefined): boolean =>
  status === 400 &&
  (body?.error?.code === 'ActiveRequestAlreadyExists' ||
    CONFLICT_MESSAGE.test(body?.error?.message ?? ''));

/** True when a machine action was refused because another one is pending on the device. */
export const isActionConflict = (error: unknown): boolean =>
  error instanceof MdeApiError &&
  error.status === 400 &&
  (error.code === 'ActiveRequestAlreadyExists' || CONFLICT_MESSAGE.test(error.message));

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const CONFLICT_ACTION_REF = new RegExp(`\\b([A-Za-z]+) action:?\\s*(${UUID})`, 'i');

/**
 * The pending action named in a conflict message, such as "Cannot isolate device because Isolate
 * action: 172ba902-c562-42c6-a025-3637dda40563 is still active." Undefined when it names none.
 */
export const parseConflictingActionRef = (
  message: string
): { id: string; type: string } | undefined => {
  const match = CONFLICT_ACTION_REF.exec(message);
  return match ? { type: match[1], id: match[2].toLowerCase() } : undefined;
};

/**
 * The API answers 400 InvalidDefenderRunningMode ("Invalid Windows Defender Anti-Virus running
 * mode: <n>") when an action needs Microsoft Defender Antivirus in active mode and the device runs
 * it in passive mode, EDR in block mode, or not at all (for example restrictCodeExecution).
 */
const DEFENDER_RUNNING_MODE_CODE = 'InvalidDefenderRunningMode';

/**
 * The API answers 403 "Unauthorized request - No active license found" when the token is valid
 * but the tenant has no Defender for Endpoint license in the cloud the request reached, for
 * example a commercial tenant called through the GCC API host. No permission fixes it.
 */
const NO_LICENSE_MESSAGE = /no active license/i;

const describeStatus = (status: number, body: MdeErrorBody | undefined, fallback: string) => {
  const code = body?.error?.code;
  const message = body?.error?.message ?? fallback;
  return `HTTP ${status}${code ? ` ${code}` : ''}: ${message}`;
};

/** Turns an Axios error into a message that says what failed and what to do about it. */
export const formatMdeError = (error: unknown, options: MdeRequestOptions): MdeApiError => {
  if (!isAxiosError(error) || !error.response) {
    const reason = error instanceof Error ? error.message : String(error);
    const tooLarge = /maxContentLength/.test(reason)
      ? '. The response is larger than the Kibana response size limit (xpack.actions.maxResponseContentLength): request fewer records with top.'
      : '';
    return new MdeApiError(`Microsoft Defender for Endpoint request failed: ${reason}${tooLarge}`);
  }
  const { status, data } = error.response;
  const body = (typeof data === 'object' && data !== null ? data : undefined) as
    | MdeErrorBody
    | undefined;
  const detail = describeStatus(status, body, error.message);
  const prefix = `Microsoft Defender for Endpoint ${options.method.toUpperCase()} ${
    options.path
  } failed (${detail})`;
  const fail = (message: string) => new MdeApiError(message, status, body?.error?.code);

  if (status === 401) {
    return fail(
      `${prefix}. The access token was rejected: check the client ID, the client secret or certificate, the tenant ID in the token URL, and that the scope matches the connector's Defender cloud.`
    );
  }
  if (status === 403 && NO_LICENSE_MESSAGE.test(body?.error?.message ?? '')) {
    return fail(
      `${prefix}. The tenant has no Microsoft Defender for Endpoint license in the Defender cloud this request reached: check that the connector's Defender cloud (and custom API URL, if set) is the one the tenant belongs to, and that the tenant has a Defender for Endpoint license.`
    );
  }
  if (status === 403) {
    return fail(
      `${prefix}. The token is valid but not allowed to do this: grant the app registration the WindowsDefenderATP application permission ${options.permission} with admin consent, and check the device group scope.`
    );
  }
  if (status === 400 && body?.error?.code === DEFENDER_RUNNING_MODE_CODE) {
    return fail(
      `${prefix}. This action needs Microsoft Defender Antivirus in active mode on the device, and it is not (it runs in passive mode, in EDR block mode, or is turned off). Make Defender Antivirus the device's active antivirus, or use another containment action such as isolateHost.`
    );
  }
  if (isConflictBody(status, body)) {
    return fail(
      `${prefix}. Another action of this kind is already pending on the device; wait for it with getActions or cancel it with cancelAction.`
    );
  }
  if (status === 429) {
    const retryAfter = parseRetryAfter(error.response.headers?.['retry-after']);
    const wait = retryAfter === undefined ? '' : ` Retry after ${Math.ceil(retryAfter / 1000)} s.`;
    return fail(`${prefix}. The tenant's API rate limit was reached.${wait}`);
  }
  return fail(`${prefix}.`);
};

const retryDelay = (status: number, retryAfterHeader: unknown, attempt: number) => {
  const backoff = INITIAL_BACKOFF_MS * 2 ** (attempt - 1);
  if (status === 429) {
    return parseRetryAfter(retryAfterHeader) ?? backoff;
  }
  return backoff;
};

/**
 * Sends one request to the Defender for Endpoint API. A 429 is retried for every method (the
 * request was not processed), honouring Retry-After; a 5xx only for idempotent calls. 400, 401,
 * 403 and 404 are never retried.
 */
export const mdeRequest = async <T>(ctx: ActionContext, options: MdeRequestOptions): Promise<T> => {
  assertCloudConsistency(ctx);
  assertSecureApiUrl(ctx);
  const url = `${getApiUrl(ctx)}${options.path}`;
  const idempotent = options.idempotent ?? options.method.toUpperCase() === 'GET';
  let waitedMs = 0;

  for (let attempt = 1; ; attempt++) {
    try {
      const response = await ctx.client.request<T>({
        method: options.method,
        url,
        params: options.params,
        data: options.data,
        // Never follow a redirect: the API does not send one, and following it would send the
        // request (and, depending on the HTTP stack, the bearer token) to another host.
        maxRedirects: 0,
        ...(options.timeout ? { timeout: options.timeout } : {}),
      });
      return response.data;
    } catch (error) {
      const response = isAxiosError(error) ? error.response : undefined;
      const status = response?.status;
      const retryable =
        status === 429 ||
        (status !== undefined && idempotent && RETRYABLE_SERVER_ERRORS.has(status));
      if (!response || !retryable || attempt >= MAX_ATTEMPTS) {
        throw formatMdeError(error, options);
      }
      const delay = retryDelay(response.status, response.headers?.['retry-after'], attempt);
      if (waitedMs + delay > MAX_TOTAL_RETRY_WAIT_MS) {
        throw formatMdeError(error, options);
      }
      waitedMs += delay;
      ctx.log.debug(
        `Microsoft Defender for Endpoint ${
          options.path
        } answered ${status}; retrying in ${delay} ms (attempt ${attempt + 1} of ${MAX_ATTEMPTS})`
      );
      await retryTiming.sleep(delay);
    }
  }
};

export interface ListResult<T> {
  value: T[];
  /** Number of records in `value`. */
  count: number;
  /**
   * True when the page was full (`count` equals `top`), so another page may follow. The API does
   * not return `@odata.nextLink` for these collections in practice, so this full-page rule is what
   * decides; a nextLink, if one ever comes, is only an extra signal. The last page can be empty.
   */
  hasMore: boolean;
  /** Computed by the connector: the `skip` to pass for the next page. Present when hasMore. */
  nextSkip?: number;
  /** `@odata.nextLink` if the API returned one (normally absent). Page with `skip`, not this URL. */
  nextLink?: string;
}

/**
 * Reads one page of an OData collection with `$filter`, `$top` and `$skip`. Paging is by `skip`
 * so the caller never hands the connector a URL to request.
 */
export const mdeList = async <T>(
  ctx: ActionContext,
  path: string,
  input: ListInput,
  options: { permission: string; params?: Record<string, string | undefined> }
): Promise<ListResult<T>> => {
  const top = input.top ?? DEFAULT_TOP;
  const skip = input.skip ?? 0;
  const data = await mdeRequest<{ value?: T[]; '@odata.nextLink'?: string }>(ctx, {
    method: 'GET',
    path,
    permission: options.permission,
    params: {
      $filter: input.filter,
      $top: top,
      ...(skip > 0 ? { $skip: skip } : {}),
      ...options.params,
    },
  });
  const value = data?.value ?? [];
  const nextLink = data?.['@odata.nextLink'];
  // Full-page rule: Defender does not send @odata.nextLink on these collections.
  const hasMore = value.length >= top || Boolean(nextLink);
  return {
    value,
    count: value.length,
    hasMore,
    ...(hasMore ? { nextSkip: skip + value.length } : {}),
    ...(nextLink ? { nextLink } : {}),
  };
};

/** An OData string literal: the value in single quotes, with each quote doubled. */
export const odataString = (value: string): string => `'${value.replace(/'/g, "''")}'`;

/** Returns an entity without its `@odata.context` annotation. */
export const withoutODataContext = <T>(data: T): T => {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const rest = { ...(data as Record<string, unknown>) };
    delete rest['@odata.context'];
    return rest as T;
  }
  return data;
};

/**
 * Returns `{ value }` for a collection API that documents no paging. If the API still returns
 * `@odata.nextLink`, the result says it is truncated and carries the link (not followed: the
 * connector never requests a URL taken from a response).
 */
export const valueOf = <T>(
  data: { value?: T[]; '@odata.nextLink'?: string } | undefined
): { value: T[]; count: number; truncated?: true; nextLink?: string } => {
  const value = data?.value ?? [];
  const nextLink = data?.['@odata.nextLink'];
  return { value, count: value.length, ...(nextLink ? { truncated: true, nextLink } : {}) };
};

/** "user1@contoso.com" and "CONTOSO\\user1" both become "user1": the user APIs take the bare name. */
export const toBareUserName = (user: string): string => {
  const afterDomain = user.includes('\\') ? user.slice(user.lastIndexOf('\\') + 1) : user;
  const beforeAt = afterDomain.includes('@')
    ? afterDomain.slice(0, afterDomain.indexOf('@'))
    : afterDomain;
  return beforeAt;
};
