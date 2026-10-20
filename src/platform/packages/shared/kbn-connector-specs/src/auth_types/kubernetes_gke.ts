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

export const KUBERNETES_GKE_AUTH_ID = 'kubernetes_gke';

/**
 * GKE accepts a Google OAuth2 access token directly as the Kubernetes bearer
 * token. `cloud-platform` covers the Kubernetes Engine APIs; `userinfo.email`
 * is the scope GKE documents for resolving the caller's identity.
 */
const authSchema = lazySchema(() =>
  z
    .object({
      serviceAccountJson: z
        .string()
        .min(1, { message: i18n.KUBERNETES_GKE_SERVICE_ACCOUNT_JSON_REQUIRED_MESSAGE })
        .meta({
          sensitive: true,
          widget: 'fileUpload',
          widgetOptions: { accept: '.json' },
          label: i18n.KUBERNETES_GKE_SERVICE_ACCOUNT_JSON_LABEL,
          helpText: i18n.KUBERNETES_GKE_SERVICE_ACCOUNT_JSON_HELP_TEXT,
        }),
      ...pemCaTlsSchemaFields(),
    })
    .meta({ label: i18n.KUBERNETES_GKE_AUTH_LABEL })
);

export type KubernetesGkeAuthSchema = z.infer<typeof authSchema>;

/**
 * Google Kubernetes Engine (GKE) authentication.
 *
 * Exchanges a GCP service account JSON key for a short-lived (1 hour) OAuth2
 * access token via the JWT bearer assertion flow (RFC 7523) and sends it as
 * the Kubernetes bearer token. The GKE API server validates the token against
 * Google identity; authorization is the union of Cloud IAM and in-cluster
 * RBAC bindings for the service account's email.
 *
 * A fresh token is minted per action execution, so credentials rotate at the
 * source without long-lived cluster tokens.
 */
export const KubernetesGkeAuth: AuthTypeDefinition = {
  id: KUBERNETES_GKE_AUTH_ID,
  schema: authSchema,
};
