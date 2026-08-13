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

export const KUBERNETES_AKS_AUTH_ID = 'kubernetes_aks';

/**
 * The well-known application ID of the AKS server app in Microsoft Entra ID.
 * It is a first-party application with the same ID in every tenant; tokens
 * issued for it are accepted as bearer tokens by Entra-integrated AKS API
 * servers (this is what kubelogin requests in its non-interactive modes).
 */
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
      ...pemCaTlsSchemaFields(),
    })
    .meta({ label: i18n.KUBERNETES_AKS_AUTH_LABEL })
);

export type KubernetesAksAuthSchema = z.infer<typeof authSchema>;

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
export const KubernetesAksAuth: AuthTypeDefinition = {
  id: KUBERNETES_AKS_AUTH_ID,
  schema: authSchema,
};
