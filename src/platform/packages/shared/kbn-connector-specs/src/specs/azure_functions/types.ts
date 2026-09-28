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
    .regex(/^[A-Za-z0-9._~/-]+$/, 'Must be a URL path without query string or protocol.')
    .optional()
    .describe(
      'Route of the HTTP trigger relative to the app root, used when the function declares a custom route in function.json. Example: "api/quarantine/host". Defaults to "api/{functionName}". Do not include a query string.'
    ),
  body: z
    .unknown()
    .optional()
    .describe(
      'JSON request body sent to the function. Omit for GET triggers. Example: {"hostId": "abc-123"}.'
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
