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

export const BEARER_WITH_TLS_AUTH_ID = 'bearer_with_tls';

const authSchema = lazySchema(() =>
  z
    .object({
      token: z
        .string()
        .min(1, { message: i18n.BEARER_WITH_TLS_AUTH_TOKEN_REQUIRED_MESSAGE })
        .meta({ sensitive: true, label: i18n.BEARER_WITH_TLS_AUTH_TOKEN_LABEL }),
      ...pemCaTlsSchemaFields(),
    })
    .meta({ label: i18n.BEARER_WITH_TLS_AUTH_LABEL })
);

export type BearerWithTlsAuthSchema = z.infer<typeof authSchema>;

/**
 * Bearer token authentication with optional PEM CA / verification mode.
 *
 * Use for self-hosted HTTPS APIs that accept a long-lived API token via
 * `Authorization: Bearer <token>` and may present a private CA (e.g. Kubernetes
 * service account tokens, Argo CD API tokens, Ansible Controller PATs).
 *
 * Connector-specific labels can be supplied via AuthTypeDef.overrides.
 */
export const BearerWithTlsAuth: AuthTypeDefinition = {
  id: BEARER_WITH_TLS_AUTH_ID,
  schema: authSchema,
};
