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

const authSchema = lazySchema(() =>
  z
    .object({
      webhookUrl: z
        .url({ error: i18n.WEBHOOK_URL_REQUIRED_MESSAGE })
        .max(2048)
        .meta({
          sensitive: true,
          label: i18n.WEBHOOK_URL_LABEL,
          validate: { allowedHosts: true },
        }),
    })
    .meta({ label: i18n.WEBHOOK_AUTH_LABEL })
);

type AuthSchemaType = z.infer<typeof authSchema>;

export const WebhookAuth: AuthTypeSpec<AuthSchemaType> = {
  id: 'webhook',
  schema: authSchema,
  configure: async (_: AuthContext, axiosInstance: AxiosInstance): Promise<AxiosInstance> =>
    axiosInstance,
};
