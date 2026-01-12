/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import type { AxiosInstance } from 'axios';
import type { AuthContext, AuthTypeSpec } from '../connector_spec';
import * as i18n from './translations';

const authSchema = z
  .object({
    authorizationUrl: z.url().meta({ label: i18n.OAUTH_AUTHORIZATION_URL_LABEL }),
    tokenUrl: z.url().meta({ label: i18n.OAUTH_TOKEN_URL_LABEL }),
    clientId: z
      .string()
      .min(1, { message: i18n.OAUTH_CLIENT_ID_REQUIRED_MESSAGE })
      .meta({ label: i18n.OAUTH_CLIENT_ID_LABEL }),
    scope: z.string().meta({ label: i18n.OAUTH_SCOPE_LABEL }).optional(),
    clientSecret: z
      .string()
      .min(1, { message: i18n.OAUTH_CLIENT_SECRET_REQUIRED_MESSAGE })
      .meta({ label: i18n.OAUTH_CLIENT_SECRET_LABEL, sensitive: true }),
    useBasicAuth: z.boolean().default(true).optional().meta({
      hidden: true, // Hidden from UI - uses connector spec defaults
    }),
  })
  .meta({ label: i18n.OAUTH_AUTHORIZATION_CODE_LABEL });

type AuthSchemaType = z.infer<typeof authSchema>;

/**
 * OAuth2 Authorization Code Flow with PKCE
 *
 * This is a generic, reusable auth type for any OAuth2 provider that supports the
 * Authorization Code flow (Microsoft, Google, Salesforce, Slack, etc.).
 *
 * ## How it works:
 * 1. User clicks the "Authorize" button in the connector UI
 * 2. _start_oauth_flow route generates PKCE parameters and returns the provider's authorization URL
 * 3. UI opens the authorization URL where user authorizes the app
 * 4. Provider redirects back to the _oauth_callback route with the authorization code
 * 5. Callback route exchanges code for access/refresh tokens and stores them
 * 6. Tokens are auto-refreshed when expired during connector execution
 *
 * ## Usage in connector specs:
 * Different providers use different OAuth endpoints - specify these in your connector's auth defaults:
 *
 * ```typescript
 * // Example: Microsoft/SharePoint
 * auth: {
 *   types: [{
 *     type: 'oauth_authorization_code',
 *     defaults: {
 *       authorizationUrl: 'https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/authorize',
 *       tokenUrl: 'https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token',
 *       scope: 'https://graph.microsoft.com/.default offline_access'
 *     }
 *   }]
 * }
 *
 * // Example: Google Drive
 * auth: {
 *   types: [{
 *     type: 'oauth_authorization_code',
 *     defaults: {
 *       authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
 *       tokenUrl: 'https://oauth2.googleapis.com/token',
 *       scope: 'https://www.googleapis.com/auth/drive.readonly'
 *     }
 *   }]
 * }
 * ```
 *
 * Users will fill in their client ID, client secret, and can customize URLs/scopes if needed.
 * The _start_oauth_flow and _oauth_callback routes are generic and work with any provider.
 */
export const OAuthAuthorizationCode: AuthTypeSpec<AuthSchemaType> = {
  id: 'oauth_authorization_code',
  schema: authSchema,
  configure: async (
    ctx: AuthContext,
    axiosInstance: AxiosInstance,
    secret: AuthSchemaType
  ): Promise<AxiosInstance> => {
    // For authorization code flow, tokens are managed separately via callback routes
    // The getToken() method will retrieve already-stored tokens and auto-refresh if needed
    // For this auth spec, getToken() calls getOAuthAuthorizationCodeAccessToken()
    let token;
    try {
      token = await ctx.getToken({
        tokenUrl: secret.tokenUrl,
        scope: secret.scope,
        clientId: secret.clientId,
        clientSecret: secret.clientSecret,
      });
    } catch (error) {
      throw new Error(
        `Unable to retrieve/refresh the access token. User may need to re-authorize: ${error.message}`
      );
    }

    if (!token) {
      throw new Error(`No access token available. User must complete OAuth authorization flow.`);
    }

    // set global defaults
    axiosInstance.defaults.headers.common.Authorization = token;

    return axiosInstance;
  },
};
