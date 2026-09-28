/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Azure Functions Connector
 *
 * Gives workflow authors a first-class invoke action for HTTP-triggered Azure
 * Functions, plus the function-app lifecycle and key-retrieval actions an
 * invoke and a recovery step depend on.
 *
 * Azure splits functions across two planes, and this connector spans both:
 *
 * - The **management plane** (Azure Resource Manager, `management.azure.com`)
 *   resolves apps and functions, reads keys, and starts/stops/restarts an app.
 *   Every one of these actions authenticates with the ARM-scoped bearer token
 *   that `ctx.client` is already configured with.
 * - The **data plane** (the app's own hostname, e.g. `myapp.azurewebsites.net`)
 *   runs the function. It does *not* accept the ARM token: it authenticates
 *   with a function or host key in the `x-functions-key` header. `invoke`
 *   therefore resolves the app's hostname over ARM first, then clears the
 *   Authorization header for the data-plane request.
 *
 * Authentication is OAuth 2.0 Client Credentials (an Entra service principal /
 * app registration) scoped to `https://management.azure.com/.default`.
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import {
  GetFunctionAppInputSchema,
  GetFunctionInputSchema,
  InvokeInputSchema,
  ListFunctionAppsInputSchema,
  ListFunctionKeysInputSchema,
  ListFunctionsInputSchema,
  ListHostKeysInputSchema,
  ListSyncFunctionTriggersInputSchema,
  RestartFunctionAppInputSchema,
  StartFunctionAppInputSchema,
  StopFunctionAppInputSchema,
} from './types';
import type {
  GetFunctionAppInput,
  GetFunctionInput,
  InvokeInput,
  ListFunctionAppsInput,
  ListFunctionKeysInput,
  ListFunctionsInput,
  ListHostKeysInput,
  ListSyncFunctionTriggersInput,
  RestartFunctionAppInput,
  StartFunctionAppInput,
  StopFunctionAppInput,
} from './types';

const ARM_BASE = 'https://management.azure.com';

/**
 * Every route this connector calls lives in the Microsoft.Web provider, which
 * versions all of them together, so one api-version covers the whole spec.
 */
const WEB_API_VERSION = '2024-11-01';

function getSubscriptionId(ctx: ActionContext): string {
  const subscriptionId = ctx.config?.subscriptionId as string | undefined;
  if (!subscriptionId) {
    throw new Error(
      'Azure Functions connector is missing the required subscriptionId configuration field.'
    );
  }
  return subscriptionId;
}

/**
 * Build the ARM resource path of a function app (App Service site). Both
 * segments are escaped even though their schemas constrain the character set,
 * so a schema change can never silently turn into a corrupted request path.
 */
function getSiteBase(ctx: ActionContext, resourceGroupName: string, siteName: string): string {
  return `${ARM_BASE}/subscriptions/${getSubscriptionId(ctx)}/resourceGroups/${encodeURIComponent(
    resourceGroupName
  )}/providers/Microsoft.Web/sites/${encodeURIComponent(siteName)}`;
}

function extractAzureErrorMessage(error: unknown): string {
  const err = error as {
    response?: {
      status?: number;
      statusText?: string;
      data?: { error?: { code?: string; message?: string } };
    };
    message?: string;
  };

  const azureError = err.response?.data?.error;
  if (azureError) {
    return `Azure API error [${azureError.code}]: ${azureError.message}`;
  }

  const rawBody =
    typeof err.response?.data === 'string'
      ? err.response.data
      : err.response?.data
      ? JSON.stringify(err.response.data)
      : '';
  const detail = rawBody ? ` — ${rawBody}` : '';

  if (err.response?.status === 401) {
    return `Authentication failed (401)${detail}`;
  } else if (err.response?.status === 403) {
    return `Access denied (403)${detail}`;
  }
  return `Azure API request failed: ${err.response?.statusText || err.message}${detail}`;
}

function throwAzureError(error: unknown): never {
  throw new Error(extractAzureErrorMessage(error));
}

export const AzureFunctions: ConnectorSpec = {
  metadata: {
    id: '.azure_functions',
    displayName: 'Azure Functions',
    description: i18n.translate('core.kibanaConnectorSpecs.azureFunctions.metadata.description', {
      defaultMessage:
        'Invoke HTTP-triggered Azure Functions, read function keys, and start, stop, or restart function apps',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    // A new connector type must reach Production-NonCanary before it can declare
    // user-facing features, so 'workflows' is added in a follow-up PR.
    supportedFeatureIds: ['agentBuilder'],
  },

  auth: {
    types: [
      {
        type: 'oauth_client_credentials',
        isRecommended: true,
        defaults: {
          scope: 'https://management.azure.com/.default',
        },
        overrides: {
          meta: {
            scope: { hidden: true },
            tokenUrl: {
              label: i18n.translate(
                'core.kibanaConnectorSpecs.azureFunctions.auth.tokenUrl.label',
                {
                  defaultMessage: 'Token URL',
                }
              ),
              placeholder: 'https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token',
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.azureFunctions.auth.tokenUrl.helpText',
                {
                  defaultMessage:
                    "Replace '{tenantId}' with your Microsoft Entra tenant ID. The app registration (service principal) needs the Reader role on the subscription for getFunctionApp, listFunctionApps, listFunctions, and getFunction; the Website Contributor role to restart, stop, or start an app, to re-sync triggers with listSyncFunctionTriggers, and to read keys with listFunctionKeys or listHostKeys. The invoke action does not use this token — it authenticates with a function or host key.",
                  values: { tenantId: '{tenant-id}' },
                }
              ),
            },
            clientId: {
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.azureFunctions.auth.clientId.helpText',
                {
                  defaultMessage:
                    'The Application (client) ID of the Microsoft Entra app registration.',
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
      subscriptionId: z
        .string()
        .min(1)
        .max(100)
        .regex(
          /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
          'Must be a valid Azure subscription ID (GUID).'
        )
        .describe(
          i18n.translate('core.kibanaConnectorSpecs.azureFunctions.config.subscriptionId', {
            defaultMessage: 'Azure subscription ID',
          })
        )
        .meta({
          widget: 'text',
          label: i18n.translate(
            'core.kibanaConnectorSpecs.azureFunctions.config.subscriptionId.label',
            {
              defaultMessage: 'Subscription ID',
            }
          ),
          placeholder: '00000000-0000-0000-0000-000000000000',
          helpText: i18n.translate(
            'core.kibanaConnectorSpecs.azureFunctions.config.subscriptionId.helpText',
            {
              defaultMessage:
                'The Azure subscription that every action in this connector operates against.',
            }
          ),
        }),
    })
  ),

  actions: {
    // Data plane: the app's own hostname, resolved over ARM first.
    // https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-http-webhook-trigger
    invoke: {
      isTool: true,
      scope: 'destroy',
      description:
        'Invoke an HTTP-triggered Azure Function and return its response status, headers, and body. This is the primary action: use it to run custom remediation or enrichment code from a workflow. Requires a function or host key unless the trigger is anonymous — get one from listFunctionKeys (this function only) or listHostKeys (any function in the app). Classified as a write/destroy action because the function body can do anything.',
      input: InvokeInputSchema,
      handler: async (ctx, input: InvokeInput) => {
        let defaultHostName: string | undefined;
        try {
          const site = await ctx.client.get(
            getSiteBase(ctx, input.resourceGroupName, input.functionAppName),
            { params: { 'api-version': WEB_API_VERSION } }
          );
          defaultHostName = site.data?.properties?.defaultHostName as string | undefined;
        } catch (error) {
          throwAzureError(error);
        }

        if (!defaultHostName) {
          throw new Error(
            `Function app '${input.functionAppName}' has no defaultHostName, so its HTTP trigger endpoint cannot be resolved. Confirm the app exists and is not stopped.`
          );
        }

        // A custom route is already a path, so it is inserted verbatim (its
        // schema forbids a query string and any character that would change
        // the request target). A bare function name is a single segment and
        // is escaped.
        const path = input.route ?? `api/${encodeURIComponent(input.functionName)}`;
        const method = input.method ?? 'POST';

        try {
          const response = await ctx.client.request({
            method,
            url: `https://${defaultHostName}/${path}`,
            ...(input.body !== undefined && { data: input.body }),
            ...(input.query && { params: input.query }),
            headers: {
              'Content-Type': 'application/json',
              // The data plane rejects the ARM-scoped bearer token that
              // ctx.client carries; it authenticates with the function key.
              Authorization: undefined,
              ...(input.functionKey && { 'x-functions-key': input.functionKey }),
            },
          });
          return {
            status: response.status,
            headers: response.headers,
            body: response.data,
          };
        } catch (error) {
          throwAzureError(error);
        }
      },
    },

    // https://learn.microsoft.com/en-us/rest/api/appservice/web-apps/list-function-keys
    listFunctionKeys: {
      isTool: true,
      scope: 'read',
      description:
        'Read the function-level keys of one HTTP-triggered function, as a name-to-key map. Call this to obtain the functionKey that invoke needs for a function whose authLevel is "function". Returns only the keys scoped to that one function — use listHostKeys for a key that works across the whole app.',
      input: ListFunctionKeysInputSchema,
      handler: async (ctx, input: ListFunctionKeysInput) => {
        try {
          const response = await ctx.client.post(
            `${getSiteBase(
              ctx,
              input.resourceGroupName,
              input.functionAppName
            )}/functions/${encodeURIComponent(input.functionName)}/listkeys`,
            undefined,
            { params: { 'api-version': WEB_API_VERSION } }
          );
          return response.data;
        } catch (error) {
          throwAzureError(error);
        }
      },
    },

    // https://learn.microsoft.com/en-us/rest/api/appservice/web-apps/get
    getFunctionApp: {
      isTool: true,
      scope: 'read',
      description:
        'Get a function app\'s configuration and running state: state ("Running" or "Stopped"), availabilityState, usageState, defaultHostName, enabled, httpsOnly, location, and SKU. Use this to resolve an app referenced by an alert and to decide whether a restart is needed before invoking a function on it.',
      input: GetFunctionAppInputSchema,
      handler: async (ctx, input: GetFunctionAppInput) => {
        try {
          const response = await ctx.client.get(
            getSiteBase(ctx, input.resourceGroupName, input.functionAppName),
            { params: { 'api-version': WEB_API_VERSION } }
          );
          return response.data;
        } catch (error) {
          throwAzureError(error);
        }
      },
    },

    // https://learn.microsoft.com/en-us/rest/api/appservice/web-apps/restart
    restartFunctionApp: {
      isTool: true,
      scope: 'destroy',
      description:
        'Restart a function app. This is the primary non-destructive recovery path for a wedged app: it drops in-flight executions but keeps the app and its configuration intact. Prefer it over a stop/start pair. Set softRestart to restart only if necessary, and synchronous to wait for the restart to finish.',
      input: RestartFunctionAppInputSchema,
      handler: async (ctx, input: RestartFunctionAppInput) => {
        try {
          // softRestart and synchronous are query-string params on this route
          // (verified against the Microsoft.Web 2024-11-01 REST spec), not a
          // request body — the route takes no body at all.
          const response = await ctx.client.post(
            `${getSiteBase(ctx, input.resourceGroupName, input.functionAppName)}/restart`,
            undefined,
            {
              params: {
                'api-version': WEB_API_VERSION,
                ...(input.softRestart !== undefined && { softRestart: input.softRestart }),
                ...(input.synchronous !== undefined && { synchronous: input.synchronous }),
              },
            }
          );
          return { status: response.status, functionAppName: input.functionAppName };
        } catch (error) {
          throwAzureError(error);
        }
      },
    },

    // https://learn.microsoft.com/en-us/rest/api/appservice/web-apps/list-functions
    listFunctions: {
      isTool: true,
      scope: 'read',
      description:
        "List the functions in a function app, with each function's trigger config, language, invoke_url_template, and isDisabled flag. Call this to discover invocable targets (and their routes) before an invoke when the function name is not known ahead of time.",
      input: ListFunctionsInputSchema,
      handler: async (ctx, input: ListFunctionsInput) => {
        try {
          const response = await ctx.client.get(
            `${getSiteBase(ctx, input.resourceGroupName, input.functionAppName)}/functions`,
            { params: { 'api-version': WEB_API_VERSION } }
          );
          return response.data;
        } catch (error) {
          throwAzureError(error);
        }
      },
    },

    // https://learn.microsoft.com/en-us/rest/api/appservice/web-apps/list
    // https://learn.microsoft.com/en-us/rest/api/appservice/web-apps/list-by-resource-group
    listFunctionApps: {
      isTool: true,
      scope: 'read',
      description:
        'List the App Service sites in the subscription, or in one resource group when resourceGroupName is supplied. Use this to pick a target app when its resource group and name are not known ahead of time. Note that the result includes every App Service site, not only function apps — a function app has a "kind" containing "functionapp".',
      input: ListFunctionAppsInputSchema,
      handler: async (ctx, input: ListFunctionAppsInput) => {
        try {
          const subscriptionScope = `${ARM_BASE}/subscriptions/${getSubscriptionId(ctx)}`;
          // includeSlots only exists on the by-resource-group route; the
          // subscription-wide route takes no query params beyond api-version.
          const url = input.resourceGroupName
            ? `${subscriptionScope}/resourceGroups/${encodeURIComponent(
                input.resourceGroupName
              )}/providers/Microsoft.Web/sites`
            : `${subscriptionScope}/providers/Microsoft.Web/sites`;

          const response = await ctx.client.get(url, {
            params: {
              'api-version': WEB_API_VERSION,
              ...(input.resourceGroupName &&
                input.includeSlots !== undefined && { includeSlots: input.includeSlots }),
            },
          });
          return response.data;
        } catch (error) {
          throwAzureError(error);
        }
      },
    },

    // https://learn.microsoft.com/en-us/rest/api/appservice/web-apps/stop
    stopFunctionApp: {
      isTool: true,
      scope: 'destroy',
      description:
        'Stop a function app, so it runs no further executions until it is started again. Use this to contain a misbehaving or compromised workload. This is more disruptive than restartFunctionApp — the app stays down until startFunctionApp is called.',
      input: StopFunctionAppInputSchema,
      handler: async (ctx, input: StopFunctionAppInput) => {
        try {
          const response = await ctx.client.post(
            `${getSiteBase(ctx, input.resourceGroupName, input.functionAppName)}/stop`,
            undefined,
            { params: { 'api-version': WEB_API_VERSION } }
          );
          return { status: response.status, functionAppName: input.functionAppName };
        } catch (error) {
          throwAzureError(error);
        }
      },
    },

    // https://learn.microsoft.com/en-us/rest/api/appservice/web-apps/start
    startFunctionApp: {
      isTool: true,
      scope: 'destroy',
      description:
        'Start a stopped function app, the recovery counterpart to stopFunctionApp. Call getFunctionApp first to confirm the app is actually stopped; starting an already-running app has no effect.',
      input: StartFunctionAppInputSchema,
      handler: async (ctx, input: StartFunctionAppInput) => {
        try {
          const response = await ctx.client.post(
            `${getSiteBase(ctx, input.resourceGroupName, input.functionAppName)}/start`,
            undefined,
            { params: { 'api-version': WEB_API_VERSION } }
          );
          return { status: response.status, functionAppName: input.functionAppName };
        } catch (error) {
          throwAzureError(error);
        }
      },
    },

    // https://learn.microsoft.com/en-us/rest/api/appservice/web-apps/list-host-keys
    listHostKeys: {
      isTool: true,
      scope: 'read',
      description:
        "Read a function app's host-level keys: masterKey, functionKeys (host keys usable by any function in the app), and systemKeys. Use a host key as invoke's functionKey when one key must work across several functions. Prefer listFunctionKeys when only one function is invoked — the masterKey grants administrative access to the whole app.",
      input: ListHostKeysInputSchema,
      handler: async (ctx, input: ListHostKeysInput) => {
        try {
          const response = await ctx.client.post(
            `${getSiteBase(
              ctx,
              input.resourceGroupName,
              input.functionAppName
            )}/host/default/listkeys`,
            undefined,
            { params: { 'api-version': WEB_API_VERSION } }
          );
          return response.data;
        } catch (error) {
          throwAzureError(error);
        }
      },
    },

    // https://learn.microsoft.com/en-us/rest/api/appservice/web-apps/get-function
    getFunction: {
      isTool: true,
      scope: 'read',
      description:
        "Get one function's configuration by name, including its trigger type, custom route, invoke_url_template, language, and isDisabled flag. Use this to resolve a function's trigger type and route before invoking it, when listFunctions would return more than is needed.",
      input: GetFunctionInputSchema,
      handler: async (ctx, input: GetFunctionInput) => {
        try {
          const response = await ctx.client.get(
            `${getSiteBase(
              ctx,
              input.resourceGroupName,
              input.functionAppName
            )}/functions/${encodeURIComponent(input.functionName)}`,
            { params: { 'api-version': WEB_API_VERSION } }
          );
          return response.data;
        } catch (error) {
          throwAzureError(error);
        }
      },
    },

    // https://learn.microsoft.com/en-us/rest/api/appservice/web-apps/list-sync-function-triggers
    listSyncFunctionTriggers: {
      isTool: true,
      scope: 'read',
      description:
        "Re-synchronize the function app's trigger metadata with its deployed content and return the sync status (the ARM ListSyncFunctionTriggers operation). Call this after a deployment when listFunctions does not yet show a newly added function. It reports whether the sync succeeded; it does not return invoke URLs or keys — use listFunctions or getFunction for a trigger URL, and listFunctionKeys or listHostKeys for a key.",
      input: ListSyncFunctionTriggersInputSchema,
      handler: async (ctx, input: ListSyncFunctionTriggersInput) => {
        try {
          const response = await ctx.client.post(
            `${getSiteBase(
              ctx,
              input.resourceGroupName,
              input.functionAppName
            )}/listsyncfunctiontriggerstatus`,
            undefined,
            { params: { 'api-version': WEB_API_VERSION } }
          );
          return response.data;
        } catch (error) {
          throwAzureError(error);
        }
      },
    },
  },

  skill: [
    'Azure Functions connector — usage guidance:',
    '',
    'TWO PLANES:',
    "- Management-plane actions (getFunctionApp, listFunctionApps, listFunctions, getFunction, listFunctionKeys, listHostKeys, listSyncFunctionTriggers, restart/stop/startFunctionApp) go through Azure Resource Manager and authenticate with the connector's service principal.",
    "- invoke runs on the app's own hostname and authenticates with a function or host key instead. The connector resolves the hostname itself — pass the resource group and app name, never a URL.",
    '',
    'CORE INVOKE LOOP:',
    '- If the app and function are known: listFunctionKeys → invoke with that key as functionKey.',
    '- If they are not: listFunctionApps (pick a "kind" containing "functionapp") → listFunctions (read invoke_url_template and any custom route) → listFunctionKeys → invoke.',
    '- Pass the custom route in invoke\'s "route" only when the function declares one in function.json; otherwise omit it and the default "api/{functionName}" path is used.',
    '- An anonymous trigger needs no key; omit functionKey. A 401 from invoke means the key was missing or wrong, not that the function failed.',
    '',
    'RECOVERY:',
    '- A wedged app: getFunctionApp to read "state" → restartFunctionApp. Restart is the first choice, since it keeps the app up.',
    '- Containment of a compromised or runaway app: stopFunctionApp, then startFunctionApp once it is safe. The app runs nothing in between, so prefer restartFunctionApp unless the app must stay down.',
    '',
    'KEYS: prefer listFunctionKeys (one function) over listHostKeys (whole app), and never use the masterKey returned by listHostKeys for a normal invoke — it grants administrative access to the entire app.',
    '',
    "STALE TRIGGER METADATA: if listFunctions does not show a function that was just deployed, call listSyncFunctionTriggers to re-sync the app's trigger metadata, then list again. It returns only a sync status, not URLs or keys.",
    '',
    'AUTH SCOPES: reads need the Reader role on the subscription; restart/stop/start and every key-reading action need Website Contributor.',
  ].join('\n'),

  test: {
    enabled: true,
    description: i18n.translate('core.kibanaConnectorSpecs.azureFunctions.test.description', {
      defaultMessage:
        'Verifies Azure Functions connectivity by listing App Service sites in the subscription',
    }),
    handler: async (ctx) => {
      try {
        const response = await ctx.client.get(
          `${ARM_BASE}/subscriptions/${getSubscriptionId(ctx)}/providers/Microsoft.Web/sites`,
          { params: { 'api-version': WEB_API_VERSION } }
        );
        const count = Array.isArray(response.data?.value) ? response.data.value.length : 0;
        return {
          message: `Successfully connected to Azure: found ${count} App Service site(s) in the subscription`,
        };
      } catch (error) {
        throwAzureError(error);
      }
    },
  },
};
