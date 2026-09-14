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
import { buildEksBearerToken } from './eks_token_helpers';
import {
  KubernetesEksAuth as KubernetesEksAuthDefinition,
  type KubernetesEksAuthSchema,
} from './kubernetes_eks';
import { configurePemCaTls } from './pem_ca_tls_helpers';

export const KubernetesEksAuth: AuthTypeSpec<KubernetesEksAuthSchema> = {
  ...KubernetesEksAuthDefinition,
  configure: async (
    ctx: AuthContext,
    axiosInstance: AxiosInstance,
    secret: KubernetesEksAuthSchema
  ): Promise<AxiosInstance> => {
    const token = await buildEksBearerToken({
      accessKeyId: secret.accessKeyId,
      secretAccessKey: secret.secretAccessKey,
      region: secret.region,
      clusterName: secret.clusterName,
    });

    axiosInstance.defaults.headers.common.Authorization = `Bearer ${token}`;

    return configurePemCaTls(ctx, axiosInstance, secret);
  },
};
