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

export const KUBERNETES_AUTH_ID = 'kubernetes';

const authSchema = lazySchema(() =>
  z
    .object({
      token: z
        .string()
        .min(1, { message: i18n.KUBERNETES_AUTH_TOKEN_REQUIRED_MESSAGE })
        .meta({ sensitive: true, label: i18n.KUBERNETES_AUTH_TOKEN_LABEL }),
      ...kubernetesTlsSchemaFields(),
    })
    .meta({ label: i18n.KUBERNETES_AUTH_LABEL })
);

type AuthSchemaType = z.infer<typeof authSchema>;

/**
 * Kubernetes service account authentication.
 *
 * Sends a service account bearer token via the `Authorization` header and,
 * because Kubernetes API servers almost always present a private (cluster) CA,
 * also configures TLS verification against a pasted PEM CA certificate.
 */
export const KubernetesAuth: AuthTypeSpec<AuthSchemaType> = {
  id: KUBERNETES_AUTH_ID,
  schema: authSchema,
  configure: async (
    ctx: AuthContext,
    axiosInstance: AxiosInstance,
    secret: AuthSchemaType
  ): Promise<AxiosInstance> => {
    axiosInstance.defaults.headers.common.Authorization = `Bearer ${secret.token}`;

    return configureKubernetesTls(ctx, axiosInstance, secret);
  },
};
