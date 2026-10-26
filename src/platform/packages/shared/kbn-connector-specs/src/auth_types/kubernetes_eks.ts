/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';
import type { AuthTypeDefinition } from '../connector_spec';
import * as i18n from './translations';
import { pemCaTlsSchemaFields } from './pem_ca_tls_schema';

export const KUBERNETES_EKS_AUTH_ID = 'kubernetes_eks';

const authSchema = lazySchema(() =>
  z
    .object({
      accessKeyId: z
        .string()
        .min(1, { message: i18n.KUBERNETES_EKS_ACCESS_KEY_ID_REQUIRED_MESSAGE })
        .meta({ sensitive: true, label: i18n.KUBERNETES_EKS_ACCESS_KEY_ID_LABEL }),
      secretAccessKey: z
        .string()
        .min(1, { message: i18n.KUBERNETES_EKS_SECRET_ACCESS_KEY_REQUIRED_MESSAGE })
        .meta({ sensitive: true, label: i18n.KUBERNETES_EKS_SECRET_ACCESS_KEY_LABEL }),
      region: z.string().min(1, { message: i18n.KUBERNETES_EKS_REGION_REQUIRED_MESSAGE }).meta({
        label: i18n.KUBERNETES_EKS_REGION_LABEL,
        helpText: i18n.KUBERNETES_EKS_REGION_HELP_TEXT,
      }),
      clusterName: z
        .string()
        .min(1, { message: i18n.KUBERNETES_EKS_CLUSTER_NAME_REQUIRED_MESSAGE })
        .meta({
          label: i18n.KUBERNETES_EKS_CLUSTER_NAME_LABEL,
          helpText: i18n.KUBERNETES_EKS_CLUSTER_NAME_HELP_TEXT,
        }),
      ...pemCaTlsSchemaFields(),
    })
    .meta({ label: i18n.KUBERNETES_EKS_AUTH_LABEL })
);

export type KubernetesEksAuthSchema = z.infer<typeof authSchema>;

/**
 * Amazon EKS authentication.
 *
 * Mints the Kubernetes bearer token from the stored IAM credentials as a
 * SigV4-presigned STS `GetCallerIdentity` request (the `aws eks get-token`
 * mechanism), bound to the cluster via the signed `x-k8s-aws-id` header.
 * The IAM principal must be granted cluster access, preferably through an
 * EKS access entry (or the legacy `aws-auth` ConfigMap).
 *
 * Tokens are short-lived (the server accepts them for at most 15 minutes)
 * and minted locally per action execution — no extra network round trip.
 */
export const KubernetesEksAuth: AuthTypeDefinition = {
  id: KUBERNETES_EKS_AUTH_ID,
  schema: authSchema,
};
