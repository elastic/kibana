/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';
import type { AxiosInstance } from 'axios';
import type { AuthContext, AuthTypeSpec } from '../connector_spec';
import * as i18n from './translations';
import { configureKubernetesTls, kubernetesTlsSchemaFields } from './kubernetes_tls_helpers';

export const KUBERNETES_AKS_AUTH_ID = 'kubernetes_aks';

/**
 * The well-known application ID of the AKS server app in Microsoft Entra ID.
 * It is a first-party application with the same ID in every tenant; tokens
 * issued for it are accepted as bearer tokens by Entra-integrated AKS API
 * servers (this is what kubelogin requests in its non-interactive modes).
 */
const AKS_SERVER_APP_ID = '6dae42f8-4368-4678-94ff-3960e28e3630';
const AKS_TOKEN_SCOPE = `${AKS_SERVER_APP_ID}/.default`;

const authSchema = lazySchema(() =>
  z
    .object({
      tenantId: z
        .string()
        .min(1, { message: i18n.KUBERNETES_AKS_TENANT_ID_REQUIRED_MESSAGE })
        .meta({ label: i18n.KUBERNETES_AKS_TENANT_ID_LABEL }),
      clientId: z
        .string()
        .min(1, { message: i18n.KUBERNETES_AKS_CLIENT_ID_REQUIRED_MESSAGE })
        .meta({
          label: i18n.KUBERNETES_AKS_CLIENT_ID_LABEL,
          helpText: i18n.KUBERNETES_AKS_HELP_TEXT,
        }),
      clientSecret: z
        .string()
        .min(1, { message: i18n.KUBERNETES_AKS_CLIENT_SECRET_REQUIRED_MESSAGE })
        .meta({ sensitive: true, label: i18n.KUBERNETES_AKS_CLIENT_SECRET_LABEL }),
      ...kubernetesTlsSchemaFields(),
    })
    .meta({ label: i18n.KUBERNETES_AKS_AUTH_LABEL })
);

type AuthSchemaType = z.infer<typeof authSchema>;

/**
 * Azure Kubernetes Service (AKS) authentication.
 *
 * Runs the standard OAuth2 client credentials flow against Microsoft Entra ID
 * for a service principal, requesting a token for the well-known AKS server
 * application. Entra-integrated AKS API servers accept that token directly as
 * the Kubernetes bearer token; authorization comes from Azure RBAC for
 * Kubernetes or in-cluster RBAC bindings for the service principal.
 *
 * Token acquisition and caching are delegated to the actions framework's
 * OAuth client credentials strategy (`ctx.getToken`), so tokens are reused
 * across executions until they expire (~60-90 minutes).
 */
export const KubernetesAksAuth: AuthTypeSpec<AuthSchemaType> = {
  id: KUBERNETES_AKS_AUTH_ID,
  schema: authSchema,
  configure: async (
    ctx: AuthContext,
    axiosInstance: AxiosInstance,
    secret: AuthSchemaType
  ): Promise<AxiosInstance> => {
    let token;
    try {
      token = await ctx.getToken({
        authType: 'oauth',
        tokenUrl: `https://login.microsoftonline.com/${encodeURIComponent(
          secret.tenantId
        )}/oauth2/v2.0/token`,
        scope: AKS_TOKEN_SCOPE,
        clientId: secret.clientId,
        clientSecret: secret.clientSecret,
        tokenEndpointAuthMethod: 'client_secret_post',
      });
    } catch (error) {
      throw new Error(`Unable to retrieve an access token for AKS: ${error.message}`);
    }

    if (!token) {
      throw new Error('Unable to retrieve an access token for AKS');
    }

    axiosInstance.defaults.headers.common.Authorization = token;

    return configureKubernetesTls(ctx, axiosInstance, secret);
  },
};
