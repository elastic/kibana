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

export const API_KEY_HEADER_WITH_TLS_AUTH_ID = 'api_key_header_with_tls';

const authSchema = lazySchema(() =>
  z
    .object({
      apiKey: z
        .string()
        .min(1, { message: i18n.API_KEY_AUTH_REQUIRED_MESSAGE })
        .meta({ label: i18n.API_KEY_AUTH_LABEL, sensitive: true }),
      ...pemCaTlsSchemaFields(),
    })
    .meta({ label: i18n.API_KEY_HEADER_WITH_TLS_AUTH_LABEL })
);

export type ApiKeyHeaderWithTlsAuthSchema = z.infer<typeof authSchema>;

/**
 * Raw header API-key auth with optional PEM CA / verification mode.
 *
 * Use for self-hosted HTTPS APIs that expect `Authorization: <key>` with no
 * Bearer prefix (for example MISP automation keys) and may present a private or
 * self-signed certificate.
 */
export const ApiKeyHeaderWithTlsAuth: AuthTypeDefinition = {
  id: API_KEY_HEADER_WITH_TLS_AUTH_ID,
  schema: authSchema,
};
