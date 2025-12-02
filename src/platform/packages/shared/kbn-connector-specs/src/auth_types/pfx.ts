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
import { getCustomAgents, type SSLSettings } from '@kbn/actions-utils';
import type { AuthContext, AuthTypeSpec } from '../connector_spec';

const authSchema = z.object({
  pfx: z.string().meta({ sensitive: true }),
  passphrase: z.string().meta({ sensitive: true }).optional(),
  ca: z.string().optional(),
  verificationMode: z.enum(['none', 'certificate', 'full']).optional(),
});

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

    // clear existing interceptor and add a custom one
    axiosInstance.interceptors.request.clear();
    axiosInstance.interceptors.request.use((config) => {
      if (config.url) {
        const customHostSettings = ctx.getCustomHostSettings(config.url);

        // retrieve custom agents, this time with sslOverrides
        const { httpAgent, httpsAgent } = getCustomAgents({
          customHostSettings,
          logger: ctx.logger,
          proxySettings: ctx.proxySettings,
          sslOverrides,
          sslSettings: ctx.sslSettings,
          url: config.url,
        });

        // use httpAgent and httpsAgent and set axios proxy: false, to be able to handle fail on invalid certs
        config.httpAgent = httpAgent;
        config.httpsAgent = httpsAgent;
        config.proxy = false;
      }
      return config;
    });

    return axiosInstance;
  },
};
