/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AxiosInstance } from 'axios';
import type { AuthContext, AuthTypeSpec } from '../connector_spec';
import {
  ApiKeyHeaderWithTlsAuth as ApiKeyHeaderWithTlsAuthDefinition,
  type ApiKeyHeaderWithTlsAuthSchema,
} from './api_key_header_with_tls';
import { configurePemCaTls } from './pem_ca_tls_helpers';

export const ApiKeyHeaderWithTlsAuth: AuthTypeSpec<ApiKeyHeaderWithTlsAuthSchema> = {
  ...ApiKeyHeaderWithTlsAuthDefinition,
  configure: async (
    ctx: AuthContext,
    axiosInstance: AxiosInstance,
    secret: ApiKeyHeaderWithTlsAuthSchema
  ): Promise<AxiosInstance> => {
    // MISP and similar APIs reject `Bearer <key>`; send the raw automation key.
    axiosInstance.defaults.headers.common.Authorization = secret.apiKey;

    return configurePemCaTls(ctx, axiosInstance, secret);
  },
};
