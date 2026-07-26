/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import type { ActionContext } from './connector_spec';

/**
 * Reserved sub-action key for the framework-synthesized generic request action.
 *
 * Every v2 connector spec gets a `request` sub-action out of the box. It lets
 * workflows (and other consumers) call arbitrary endpoints of the connector's
 * API while reusing the connector's already-configured authentication and error
 * handling. No secrets are ever exposed to the caller.
 *
 * The target endpoint is resolved as follows:
 * - When `url` is provided it is used verbatim (overriding `path` and the
 *   connector's base URL).
 * - Otherwise `path` is appended to the connector's base URL, which a spec
 *   exposes via {@link ConnectorSpec.getBaseUrl}. A connector without a
 *   `getBaseUrl` (e.g. multi-host connectors) can only be called with `url`.
 */
export const GENERIC_REQUEST_SUB_ACTION = 'request';

export const GENERIC_REQUEST_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head'] as const;

export type GenericRequestMethod = (typeof GENERIC_REQUEST_METHODS)[number];

/**
 * Default human-readable description for the synthesized generic request action.
 * A spec can override it via {@link ConnectorSpec.genericRequestDescription}.
 */
export const DEFAULT_GENERIC_REQUEST_DESCRIPTION =
  "Send a custom HTTP request to any of the connector's API endpoints, reusing its " +
  'configured authentication. Provide a relative `path` (resolved against the connector base URL) ' +
  'or an absolute `url`, plus optional `method`, `body`, `headers`, and `query`.';

/**
 * Resolves a connector's base URL from the action context (config/secrets). The
 * generic request `path` is appended to this value. The API version segment is
 * intentionally left out of the base and kept in the `path` (e.g. base
 * `https://api.zoom.us`, path `/v2/users/me`).
 */
export type GetBaseUrl = (ctx: ActionContext) => string;

const methodField = z
  .enum(GENERIC_REQUEST_METHODS)
  .describe('The HTTP method to use for the request.')
  .default('get');

const bodyField = z.unknown().optional().describe('The request body. Sent as JSON.');

const headersField = z
  .record(z.string(), z.string())
  .optional()
  .describe('Additional request headers merged with the connector-configured headers.');

const queryField = z
  .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
  .optional()
  .describe('Query string parameters appended to the request URL.');

/**
 * Input schema for the generic request action of a connector that exposes a
 * base URL (via {@link ConnectorSpec.getBaseUrl}). Accepts a relative `path`
 * (resolved against the base URL) or an absolute `url` that overrides it.
 */
export const GenericRequestInputSchema = z
  .object({
    method: methodField,
    path: z
      .string()
      .optional()
      .describe(
        'The path appended to the connector-configured base URL (leading slash optional). Ignored when `url` is provided.'
      ),
    url: z
      .string()
      .optional()
      .describe(
        'An absolute URL. When provided it is used verbatim, overriding `path` and the connector-configured base URL.'
      ),
    body: bodyField,
    headers: headersField,
    query: queryField,
  })
  .strict();

/**
 * Input schema for the generic request action of a connector that does NOT
 * expose a base URL (e.g. multi-host connectors). Only an absolute `url` is
 * supported; `path` is intentionally omitted because it could never resolve.
 */
export const GenericRequestUrlOnlyInputSchema = z
  .object({
    method: methodField,
    url: z
      .string()
      .describe(
        'An absolute URL. This connector targets multiple hosts, so a full URL is required.'
      ),
    body: bodyField,
    headers: headersField,
    query: queryField,
  })
  .strict();

export type GenericRequestInput = z.infer<typeof GenericRequestInputSchema>;

/**
 * Returns the appropriate generic request input schema for a connector based on
 * whether it exposes a base URL. Connectors without a base URL cannot resolve a
 * relative `path`, so they get the `url`-only schema.
 */
export const getGenericRequestInputSchema = (hasBaseUrl: boolean) =>
  hasBaseUrl ? GenericRequestInputSchema : GenericRequestUrlOnlyInputSchema;

export const GenericRequestOutputSchema = z.object({
  status: z.number().describe('The HTTP status code of the response.'),
  headers: z.record(z.string(), z.unknown()).describe('The response headers.'),
  data: z.unknown().describe('The response body.'),
});

export type GenericRequestOutput = z.infer<typeof GenericRequestOutputSchema>;

const joinUrl = (baseUrl: string, path: string): string => {
  const trimmedBase = baseUrl.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${trimmedBase}${normalizedPath}`;
};

/**
 * Resolves the target URL for a generic request. `url` wins over `path`; when
 * neither `url` nor a resolvable base URL is available, an error is thrown.
 */
export const resolveGenericRequestUrl = (
  ctx: ActionContext,
  input: Pick<GenericRequestInput, 'path' | 'url'>,
  getBaseUrl?: GetBaseUrl
): string => {
  const { url, path } = input;
  if (url) {
    return url;
  }
  if (path === undefined) {
    throw new Error('Either "url" or "path" must be provided for the request action.');
  }
  if (!getBaseUrl) {
    throw new Error(
      'This connector does not support relative "path" requests; provide an absolute "url" instead.'
    );
  }
  return joinUrl(getBaseUrl(ctx), path);
};

/**
 * Builds the handler for the synthesized generic request action. The handler
 * relies on the connector's authenticated axios client (`ctx.client`) so
 * authentication and error handling stay on the connector side.
 */
export const buildGenericRequestHandler =
  (getBaseUrl?: GetBaseUrl) =>
  async (ctx: ActionContext, input: GenericRequestInput): Promise<GenericRequestOutput> => {
    const { method, body, headers, query } = input;
    const url = resolveGenericRequestUrl(ctx, input, getBaseUrl);
    // The resolved URL can be author-controlled (an absolute `url`, or a `path`
    // joined onto the base URL). Enforce the Actions `allowedHosts` allowlist
    // before sending the connector's authenticated client at it, so a workflow
    // author cannot exfiltrate the connector's credentials or drive SSRF to
    // arbitrary/internal hosts.
    ctx.ensureUriAllowed?.(url);
    const response = await ctx.client.request({
      method,
      url,
      ...(body !== undefined ? { data: body } : {}),
      ...(headers !== undefined ? { headers } : {}),
      ...(query !== undefined ? { params: query } : {}),
    });
    return {
      status: response.status,
      headers: response.headers as Record<string, unknown>,
      data: response.data,
    };
  };
