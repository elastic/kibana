/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AxiosInstance } from 'axios';
import { isString } from 'lodash';
import type { SSLSettings } from '@kbn/actions-utils';
import { z, lazySchema } from '@kbn/zod/v4';
import type { AuthContext, AuthTypeSpec } from '../connector_spec';
import { configureAxiosInstanceWithSsl } from '../lib/configure_axios_instance_with_ssl';
import * as i18n from './translations';

export const ANSIBLE_CONTROLLER_AUTH_ID = 'ansible_controller';

const authSchema = lazySchema(() =>
  z
    .object({
      token: z
        .string()
        .min(1, { message: i18n.ANSIBLE_CONTROLLER_AUTH_TOKEN_REQUIRED_MESSAGE })
        .meta({ sensitive: true, label: i18n.ANSIBLE_CONTROLLER_AUTH_TOKEN_LABEL }),
      caCert: z
        .string()
        .meta({
          label: i18n.ANSIBLE_CONTROLLER_AUTH_CA_LABEL,
          helpText: i18n.ANSIBLE_CONTROLLER_AUTH_CA_HELP_TEXT,
          widget: 'textarea',
          sensitive: true,
        })
        .optional(),
      verificationMode: z
        .enum(['none', 'certificate', 'full'])
        .meta({
          label: i18n.ANSIBLE_CONTROLLER_AUTH_VERIFICATION_MODE_LABEL,
          helpText: i18n.ANSIBLE_CONTROLLER_AUTH_VERIFICATION_MODE_HELP_TEXT,
        })
        .optional(),
    })
    .meta({ label: i18n.ANSIBLE_CONTROLLER_AUTH_LABEL })
);

type AuthSchemaType = z.infer<typeof authSchema>;

/**
 * Ansible Automation Controller / AWX API token authentication.
 *
 * Sends a personal access token (PAT) or OAuth2 token via the `Authorization`
 * header and optionally configures TLS verification against a pasted PEM CA
 * certificate (common for self-hosted Controller / AWX).
 */
export const AnsibleControllerAuth: AuthTypeSpec<AuthSchemaType> = {
  id: ANSIBLE_CONTROLLER_AUTH_ID,
  schema: authSchema,
  configure: async (
    ctx: AuthContext,
    axiosInstance: AxiosInstance,
    secret: AuthSchemaType
  ): Promise<AxiosInstance> => {
    axiosInstance.defaults.headers.common.Authorization = `Bearer ${secret.token}`;

    const sslOverrides: SSLSettings = {
      ...(isString(secret.verificationMode) ? { verificationMode: secret.verificationMode } : {}),
      ...(isString(secret.caCert) ? { ca: Buffer.from(secret.caCert, 'utf8') } : {}),
    };

    return configureAxiosInstanceWithSsl(ctx, axiosInstance, sslOverrides);
  },
};
