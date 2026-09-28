/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

/**
 * Cap on the serialized `invoke` request body. Azure Functions' own HTTP
 * request limit is far higher, but a connector action is driven by an LLM tool
 * call, so the payload is bounded here to keep one call from allocating an
 * arbitrarily large string on the Kibana server.
 */
const MAX_INVOKE_BODY_BYTES = 1024 * 1024;

/**
 * A custom HTTP-trigger route, relative to the app root.
 *
 * Permits the RFC 3986 `pchar` set minus `:` , plus valid percent-encoded
 * triplets, so a path parameter holding a reserved character works either raw
 * (`api/users/alice@example.com`) or encoded (`api/users/alice%40example.com`).
 *
 * Three things are deliberately excluded, because the route is interpolated
 * into the request URL after the app's own hostname:
 * - `?` and `#`, so a route cannot smuggle in a query string or fragment
 *   (query parameters belong in the `query` input, which is serialized safely)
 * - `:`, which together with the leading `//` guard keeps an absolute URL
 *   such as `http://evil.com` from being accepted as a path
 * - a leading `//`, which a browser or client would read as a
 *   protocol-relative URL pointing at another host
 *
 * A lone `%` or a malformed triplet is rejected rather than passed through,
 * since it would otherwise reach Azure as an invalid escape.
 */
const ROUTE_PATTERN =
  /^(?!\/\/)(?:[A-Za-z0-9._~!$&'()*+,;=@-]|%[0-9A-Fa-f]{2})+(?:\/(?:[A-Za-z0-9._~!$&'()*+,;=@-]|%[0-9A-Fa-f]{2})*)*$/;

/**
 * Azure resource-group names allow letters, digits, periods, underscores,
 * hyphens and parentheses, up to 90 characters. Every action interpolates this
 * value into an ARM URL path, so it is constrained here as well as escaped in
 * the handler.
 */
const ResourceGroupNameSchema = z
  .string()
  .min(1)
  .max(90)
  .regex(/^[A-Za-z0-9._()-]+$/, 'Must be a valid Azure resource group name.')
  .describe(
    'Name of the resource group that contains the function app. Example: "rg-payments-prod". Returned in the "id" field of listFunctionApps results.'
  );

/**
 * Azure App Service site names are globally unique DNS labels: letters, digits
 * and hyphens only, up to 60 characters.
 */
const FunctionAppNameSchema = z
  .string()
  .min(1)
  .max(60)
  .regex(/^[A-Za-z0-9-]+$/, 'Must be a valid Azure function app (site) name.')
  .describe(
    'Name of the function app (App Service site) that hosts the function. Example: "payments-fn-prod". Returned in the "name" field of listFunctionApps results.'
  );

/**
 * Function names are directory names inside the app, so they permit letters,
 * digits, hyphens and underscores.
 */
const FunctionNameSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/, 'Must be a valid Azure function name.')
  .describe(
    'Name of the function inside the app. Example: "QuarantineHost". Returned by listFunctions as the final segment of the "name" field.'
  );

export const FunctionAppRefSchema = z.object({
  resourceGroupName: ResourceGroupNameSchema,
  functionAppName: FunctionAppNameSchema,
});

export const GetFunctionAppInputSchema = FunctionAppRefSchema;
export type GetFunctionAppInput = z.infer<typeof GetFunctionAppInputSchema>;

export const ListFunctionAppsInputSchema = z.object({
  resourceGroupName: ResourceGroupNameSchema.optional().describe(
    'Restrict the result to one resource group. Omit to list every function app in the configured subscription.'
  ),
  includeSlots: z
    .boolean()
    .optional()
    .describe(
      'Set true to include deployment slots in the result. Only honored when resourceGroupName is supplied; defaults to false.'
    ),
});
export type ListFunctionAppsInput = z.infer<typeof ListFunctionAppsInputSchema>;

export const ListFunctionsInputSchema = FunctionAppRefSchema;
export type ListFunctionsInput = z.infer<typeof ListFunctionsInputSchema>;

export const GetFunctionInputSchema = FunctionAppRefSchema.extend({
  functionName: FunctionNameSchema,
});
export type GetFunctionInput = z.infer<typeof GetFunctionInputSchema>;

export const ListFunctionKeysInputSchema = FunctionAppRefSchema.extend({
  functionName: FunctionNameSchema,
});
export type ListFunctionKeysInput = z.infer<typeof ListFunctionKeysInputSchema>;

export const ListHostKeysInputSchema = FunctionAppRefSchema;
export type ListHostKeysInput = z.infer<typeof ListHostKeysInputSchema>;

export const ListSyncFunctionTriggersInputSchema = FunctionAppRefSchema;
export type ListSyncFunctionTriggersInput = z.infer<typeof ListSyncFunctionTriggersInputSchema>;

export const RestartFunctionAppInputSchema = FunctionAppRefSchema.extend({
  softRestart: z
    .boolean()
    .optional()
    .describe(
      'Set true to apply configuration settings and restart the app only if a restart is actually necessary. Defaults to false, which always restarts the app.'
    ),
  synchronous: z
    .boolean()
    .optional()
    .describe(
      'Set true to block until the app has restarted. Defaults to false, which returns as soon as the restart is accepted.'
    ),
});
export type RestartFunctionAppInput = z.infer<typeof RestartFunctionAppInputSchema>;

export const StartFunctionAppInputSchema = FunctionAppRefSchema;
export type StartFunctionAppInput = z.infer<typeof StartFunctionAppInputSchema>;

export const StopFunctionAppInputSchema = FunctionAppRefSchema;
export type StopFunctionAppInput = z.infer<typeof StopFunctionAppInputSchema>;

export const InvokeInputSchema = FunctionAppRefSchema.extend({
  functionName: FunctionNameSchema,
  method: z
    .enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
    .optional()
    .describe('HTTP method the function trigger accepts. Defaults to POST.'),
  route: z
    .string()
    .min(1)
    .max(200)
    .regex(
      ROUTE_PATTERN,
      'Must be a relative URL path, optionally percent-encoded, without a query string, fragment, or host.'
    )
    .optional()
    .describe(
      'Route of the HTTP trigger relative to the app root, used when the function declares a custom route in function.json. Example: "api/quarantine/host". A path parameter containing reserved characters may be percent-encoded, e.g. "api/users/alice%40example.com". Defaults to "api/{functionName}". Must not include a query string, a fragment, or a host — pass query parameters in "query" instead.'
    ),
  body: z
    .unknown()
    .optional()
    .refine(
      (value) => {
        if (value === undefined) return true;
        try {
          // Bound the serialized size rather than the shape: a function body is
          // caller-defined JSON, so there is no schema to constrain, but an
          // unbounded payload would be allocated and serialized on the Kibana
          // server before ever reaching Azure.
          return JSON.stringify(value).length <= MAX_INVOKE_BODY_BYTES;
        } catch {
          // A value that cannot be serialized (a cycle, a BigInt) could never
          // be sent to the function, so reject it here with a clear message
          // instead of failing opaquely inside the HTTP client.
          return false;
        }
      },
      {
        message: `Body must be JSON-serializable and at most ${MAX_INVOKE_BODY_BYTES} bytes once serialized.`,
      }
    )
    .describe(
      `JSON request body sent to the function. Omit for GET triggers. Example: {"hostId": "abc-123"}. Must be JSON-serializable and at most ${MAX_INVOKE_BODY_BYTES} bytes once serialized.`
    ),
  query: z
    .record(z.string().max(200), z.string().max(2000))
    .refine((value) => Object.keys(value).length <= 25, {
      message: 'At most 25 query parameters may be supplied.',
    })
    .optional()
    .describe(
      'Query string parameters appended to the trigger URL. Example: {"mode": "dry-run"}. At most 25 entries.'
    ),
  functionKey: z
    .string()
    .min(1)
    .max(1000)
    .optional()
    .describe(
      'Function-level or host-level key that authorizes the invoke, sent as the "x-functions-key" header. Obtain it from listFunctionKeys (function-level) or listHostKeys (app-wide). Omit only when the trigger\'s authLevel is "anonymous".'
    ),
});
export type InvokeInput = z.infer<typeof InvokeInputSchema>;
