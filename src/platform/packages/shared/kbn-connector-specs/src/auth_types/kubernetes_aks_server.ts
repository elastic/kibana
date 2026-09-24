/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AxiosInstance } from 'axios';
import type { AuthContext, AuthTypeSpec } from '../connector_spec';
import {
  KubernetesAksAuth as KubernetesAksAuthDefinition,
  type KubernetesAksAuthSchema,
} from './kubernetes_aks';
import { configurePemCaTls } from './pem_ca_tls_helpers';

const AKS_SERVER_APP_ID = '6dae42f8-4368-4678-94ff-3960e28e3630';
const AKS_TOKEN_SCOPE = `${AKS_SERVER_APP_ID}/.default`;

export const KubernetesAksAuth: AuthTypeSpec<KubernetesAksAuthSchema> = {
  ...KubernetesAksAuthDefinition,
  configure: async (
    ctx: AuthContext,
    axiosInstance: AxiosInstance,
    secret: KubernetesAksAuthSchema
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

    return configurePemCaTls(ctx, axiosInstance, secret);
  },
};
