/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getServerListenerMock } from './get_server_options.test.mocks';
import moment from 'moment';
import { ByteSizeValue } from '@kbn/config-schema';
import type { IHttpConfig } from './types';
import { getServerOptions } from './get_server_options';

jest.mock('fs', () => {
  const original = jest.requireActual('fs');
  return {
    // Hapi Inert patches native methods
    ...original,
    readFileSync: jest.fn(),
  };
});

const createConfig = (parts: Partial<IHttpConfig>): IHttpConfig => ({
  host: 'localhost',
  protocol: 'http1',
  port: 5601,
  socketTimeout: 120000,
  keepaliveTimeout: 120000,
  payloadTimeout: 20000,
  shutdownTimeout: moment.duration(30, 'seconds'),
  maxPayload: ByteSizeValue.parse('1048576b'),
  ...parts,
  cors: {
    enabled: false,
    allowCredentials: false,
    allowOrigin: ['*'],
    ...parts.cors,
  },
  ssl: {
    enabled: false,
    ...parts.ssl,
  },
  restrictInternalApis: false,
});

describe('getServerOptions', () => {
  beforeEach(() => {
    jest.requireMock('fs').readFileSync.mockImplementation((path: string) => `content-${path}`);
    getServerListenerMock.mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('calls `getServerListener` to retrieve the listener that will be provided in the config', () => {
    const listener = Symbol('listener');
    getServerListenerMock.mockReturnValue(listener);

    const httpConfig = createConfig({});
    const serverOptions = getServerOptions(httpConfig, { configureTLS: true });

    expect(getServerListenerMock).toHaveBeenCalledTimes(1);
    expect(getServerListenerMock).toHaveBeenCalledWith(httpConfig, { configureTLS: true });

    expect(serverOptions.listener).toBe(listener);
  });

  it('properly configures the tls option depending on the config and the configureTLS flag', () => {
    expect(
      getServerOptions(createConfig({ ssl: { enabled: true } }), { configureTLS: true }).tls
    ).toBe(true);
    expect(getServerOptions(createConfig({ ssl: { enabled: true } }), {}).tls).toBe(true);
    expect(
      getServerOptions(createConfig({ ssl: { enabled: true } }), { configureTLS: false }).tls
    ).toBe(false);
    expect(
      getServerOptions(createConfig({ ssl: { enabled: false } }), { configureTLS: true }).tls
    ).toBe(false);
    expect(
      getServerOptions(createConfig({ ssl: { enabled: false } }), { configureTLS: false }).tls
    ).toBe(false);
  });

  it('properly configures CORS when cors enabled', () => {
    const httpConfig = createConfig({
      cors: {
        enabled: true,
        allowCredentials: false,
        allowOrigin: ['*'],
      },
    });

    expect(getServerOptions(httpConfig).routes?.cors).toEqual({
      credentials: false,
      origin: ['*'],
      headers: ['Accept', 'Authorization', 'Content-Type', 'If-None-Match', 'kbn-xsrf'],
    });
  });

  it('properly configures `routes.payload.timeout`', () => {
    const httpConfig = createConfig({
      payloadTimeout: 9007,
    });

    expect(getServerOptions(httpConfig).routes!.payload!.timeout).toEqual(9007);
  });
});
