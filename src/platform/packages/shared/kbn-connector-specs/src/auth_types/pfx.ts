/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import type { AxiosInstance } from 'axios';
import { isString } from 'lodash';
import type { SSLSettings } from '@kbn/actions-utils';
import type { AuthContext, AuthTypeSpec } from '../connector_spec';
import * as i18n from './translations';
import { configureAxiosInstanceWithSsl } from '../lib';

const authSchema = z
  .object({
    pfx: z.string().meta({ label: i18n.PFX_AUTH_CERT_LABEL, sensitive: true }),
    passphrase: z
      .string()
      .meta({ label: i18n.PFX_AUTH_PASSPHRASE_LABEL, sensitive: true })
      .optional(),
    ca: z.string().meta({ label: i18n.PFX_AUTH_CA_LABEL }).optional(),
    verificationMode: z
      .enum(['none', 'certificate', 'full'])
      .meta({ label: i18n.PFX_AUTH_VERIFICATION_MODE_LABEL })
      .optional(),
  })
  .meta({ label: i18n.PFX_AUTH_LABEL });

type AuthSchemaType = z.infer<typeof authSchema>;

/**
 * Authenticate with PFX certificate
 */
export const PFX: AuthTypeSpec<AuthSchemaType> = {
  id: 'pfx_certificate',
  schema: authSchema,
  configure: async (
    ctx: AuthContext,
    axiosInstance: AxiosInstance,
    secret: AuthSchemaType
  ): Promise<AxiosInstance> => {
    const sslOverrides: SSLSettings = {
      pfx: Buffer.from(secret.pfx, 'base64'),
      ...(isString(secret.passphrase) ? { passphrase: secret.passphrase } : {}),
      ...(isString(secret.verificationMode) ? { verificationMode: secret.verificationMode } : {}),
      ...(isString(secret.ca) ? { ca: Buffer.from(secret.ca, 'base64') } : {}),
    };

    return configureAxiosInstanceWithSsl(ctx, axiosInstance, sslOverrides);
  },
};
