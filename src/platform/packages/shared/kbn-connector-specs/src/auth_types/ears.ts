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
import { normalizeAuthorizationHeaderValue } from './oauth_authz_code_and_ears_helpers';
import * as i18n from './translations';

export const EARS_PROVIDERS = ['google', 'microsoft', 'slack'] as const;

const authSchema = z
  .object({
    provider: z.enum(EARS_PROVIDERS).meta({ hidden: true }),
    scope: z.string().meta({ label: i18n.OAUTH_SCOPE_LABEL }).optional(),
  })
  .meta({ label: i18n.EARS_LABEL });

type AuthSchemaType = z.infer<typeof authSchema>;

/**
 * EARS (Elastic Authentication Redirect Service) OAuth Flow
 *
 * EARS is an OAuth proxy that manages client credentials (clientId/clientSecret)
 * on behalf of the user. Instead of users creating their own OAuth apps for each
 * 3rd party, they can rely on the Elastic-owned apps for simplicity.
 * Therefore, connectors using EARS don't require users to input any
 * client credentials — EARS already knows them.
 *
 * EARS Redirect Flow:
 * 1. On `/_start_oauth_flow`, Kibana builds EARS authorize URL with callback_uri, state, scope, pkce_challenge, pkce_method, and redirects to it
 * 2. User visits EARS authorize URL → EARS redirects to OAuth provider and shows auth screen to user, in order for them to enter their credentials and authorize scopes
 * 3. OAuth provider redirects back to EARS with authz code & state
 * 4. EARS redirects to callback_uri (Kibana's `/_oauth_callback`) with authz code & state
 * 5. Kibana then exchanges code via EARS token endpoint: POST {earsTokenUrl} with code & pkce_verifier in the JSON body
 * 6. Tokens are auto-refreshed when expired during connector execution
 */
export const Ears: AuthTypeSpec<AuthSchemaType> = {
  id: 'ears',
  schema: authSchema,
  authMode: 'per-user',
  configure: async (
    ctx: AuthContext,
    axiosInstance: AxiosInstance,
    secret: AuthSchemaType
  ): Promise<AxiosInstance> => {
    let token;
    try {
      token = await ctx.getToken({
        authType: 'ears',
        provider: secret.provider,
        scope: secret.scope,
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
    axiosInstance.defaults.headers.common.Authorization = normalizeAuthorizationHeaderValue(token);

    return axiosInstance;
  },
};
