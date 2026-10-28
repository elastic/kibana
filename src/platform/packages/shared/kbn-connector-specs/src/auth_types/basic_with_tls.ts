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

export const BASIC_WITH_TLS_AUTH_ID = 'basic_with_tls';

const authSchema = lazySchema(() =>
  z
    .object({
      username: z
        .string()
        .min(1, { message: i18n.BASIC_AUTH_USERNAME_REQUIRED_MESSAGE })
        .meta({ label: i18n.BASIC_AUTH_USERNAME_LABEL }),
      password: z
        .string()
        .min(1, { message: i18n.BASIC_AUTH_PASSWORD_REQUIRED_MESSAGE })
        .meta({ sensitive: true, label: i18n.BASIC_AUTH_PASSWORD_LABEL }),
      ...pemCaTlsSchemaFields(),
    })
    .meta({ label: i18n.BASIC_WITH_TLS_AUTH_LABEL })
);

export type BasicWithTlsAuthSchema = z.infer<typeof authSchema>;

/**
 * HTTP Basic authentication with optional PEM CA / verification mode.
 *
 * Use for self-hosted HTTPS APIs that accept a username and password and may
 * present a private or self-signed certificate (for example SolarWinds SWIS).
 */
export const BasicWithTlsAuth: AuthTypeDefinition = {
  id: BASIC_WITH_TLS_AUTH_ID,
  schema: authSchema,
};
