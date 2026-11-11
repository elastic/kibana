/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import axios from 'axios';
import { loggerMock } from '@kbn/logging-mocks';
import type { AuthContext } from '../connector_spec';
import { ApiKeyHeaderWithTlsAuth } from './api_key_header_with_tls_server';

const mockAuthContext: AuthContext = {
  getCustomHostSettings: () => undefined,
  getToken: async () => null,
  logger: loggerMock.create(),
  sslSettings: {},
};

describe('ApiKeyHeaderWithTlsAuth', () => {
  it('sets Authorization to the raw API key without a Bearer prefix', async () => {
    const axiosInstance = axios.create();

    const { configure } = ApiKeyHeaderWithTlsAuth;
    if (!configure) {
      throw new Error('ApiKeyHeaderWithTlsAuth.configure is not defined');
    }

    await configure(mockAuthContext, axiosInstance, {
      apiKey: 'misp-automation-key',
      verificationMode: 'none',
    });

    expect(axiosInstance.defaults.headers.common.Authorization).toBe('misp-automation-key');
  });
});
