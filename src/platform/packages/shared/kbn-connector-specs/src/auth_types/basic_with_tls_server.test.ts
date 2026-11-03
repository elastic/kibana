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
import { BasicWithTlsAuth } from './basic_with_tls_server';

const mockAuthContext: AuthContext = {
  getCustomHostSettings: () => undefined,
  getToken: async () => null,
  logger: loggerMock.create(),
  sslSettings: {},
};

describe('BasicWithTlsAuth', () => {
  it('sets HTTP Basic credentials on the axios instance', async () => {
    const axiosInstance = axios.create();

    const { configure } = BasicWithTlsAuth;
    if (!configure) {
      throw new Error('BasicWithTlsAuth.configure is not defined');
    }

    await configure(mockAuthContext, axiosInstance, {
      username: 'admin',
      password: 'secret',
      verificationMode: 'none',
    });

    expect(axiosInstance.defaults.auth).toEqual({ username: 'admin', password: 'secret' });
  });

  it('rejects empty credentials', () => {
    const result = BasicWithTlsAuth.schema.safeParse({ username: '', password: '' });

    expect(result.success).toBe(false);
  });
});
