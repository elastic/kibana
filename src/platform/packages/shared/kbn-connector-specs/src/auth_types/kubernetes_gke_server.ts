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
import { getGcpAccessToken, parseServiceAccountKey } from './gcp_jwt_helpers';
import {
  KubernetesGkeAuth as KubernetesGkeAuthDefinition,
  type KubernetesGkeAuthSchema,
} from './kubernetes_gke';
import { configurePemCaTls } from './pem_ca_tls_helpers';

const GKE_TOKEN_SCOPE =
  'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/userinfo.email';

export const KubernetesGkeAuth: AuthTypeSpec<KubernetesGkeAuthSchema> = {
  ...KubernetesGkeAuthDefinition,
  configure: async (
    ctx: AuthContext,
    axiosInstance: AxiosInstance,
    secret: KubernetesGkeAuthSchema
  ): Promise<AxiosInstance> => {
    const serviceAccount = parseServiceAccountKey(secret.serviceAccountJson);

    const { accessToken } = await getGcpAccessToken(
      serviceAccount.client_email,
      serviceAccount.private_key,
      GKE_TOKEN_SCOPE
    );

    axiosInstance.defaults.headers.common.Authorization = `Bearer ${accessToken}`;

    return configurePemCaTls(ctx, axiosInstance, secret);
  },
};
