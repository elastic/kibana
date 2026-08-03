/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';

/**
 * Resource/audience for Log Analytics query API tokens. Distinct from the
 * `https://management.azure.com/.default` scope the connector's main auth
 * flow requests, because Azure issues audience-scoped tokens: an ARM-scoped
 * token is rejected by the Log Analytics query endpoint and vice versa.
 */
const LOG_ANALYTICS_SCOPE = 'https://api.loganalytics.io/.default';

/**
 * Mint an access token for a specific OAuth scope/audience using the same
 * client-credentials grant and secrets the connector was configured with.
 *
 * The connector's `oauth_client_credentials` auth type only exchanges a
 * token for the single scope configured at connector-creation time (the ARM
 * scope, used to authorize `ctx.client`). Some Azure Monitor sub-resources
 * (Log Analytics) require a token scoped to a different audience, so this
 * helper repeats the same client-credentials exchange with a different
 * `scope`, using the raw credentials from `ctx.secrets`.
 */
async function getAccessTokenForScope(ctx: ActionContext, scope: string): Promise<string> {
  const tokenUrl = ctx.secrets?.tokenUrl as string | undefined;
  const clientId = ctx.secrets?.clientId as string | undefined;
  const clientSecret = ctx.secrets?.clientSecret as string | undefined;

  if (!tokenUrl || !clientId || !clientSecret) {
    throw new Error(
      'This action requires the Azure Monitor connector to be configured with OAuth 2.0 Client Credentials ' +
        '(tokenUrl, clientId, clientSecret).'
    );
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope,
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Failed to obtain an access token for ${scope} (${response.status}): ${errorBody}`
    );
  }

  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error(`Azure AD token endpoint did not return an access_token for scope ${scope}`);
  }
  return data.access_token;
}

/**
 * Mint a Log Analytics-scoped access token for the Logs Query API
 * (`api.loganalytics.azure.com`). Requires the service principal to have the
 * "Log Analytics Reader" (or higher) role on the target workspace.
 */
export async function getLogAnalyticsAccessToken(ctx: ActionContext): Promise<string> {
  return getAccessTokenForScope(ctx, LOG_ANALYTICS_SCOPE);
}
