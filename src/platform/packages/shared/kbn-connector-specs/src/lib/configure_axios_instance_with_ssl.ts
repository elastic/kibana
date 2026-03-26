/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { AxiosInstance } from 'axios';
import type { SSLSettings } from '@kbn/actions-utils';
import { getCustomAgents } from '@kbn/actions-utils';
import type { AuthContext } from '../connector_spec';

export function configureAxiosInstanceWithSsl(
  ctx: AuthContext,
  axiosInstance: AxiosInstance,
  sslOverrides: SSLSettings
) {
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
}
