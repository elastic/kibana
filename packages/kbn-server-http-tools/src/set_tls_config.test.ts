/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getServerTLSOptionsMock } from './set_tls_config.test.mocks';
import { Server } from '@hapi/hapi';
import type { ISslConfig } from './types';
import { setTlsConfig } from './set_tls_config';

describe('setTlsConfig', () => {
  beforeEach(() => {
    getServerTLSOptionsMock.mockReset();
    getServerTLSOptionsMock.mockReturnValue({});
  });

  it('throws when called for a non-TLS server', () => {
    const server = new Server({});
    const config: ISslConfig = { enabled: true };
    expect(() => setTlsConfig(server, config)).toThrowErrorMatchingInlineSnapshot(
      `"tried to set TLS config on a non-TLS http server"`
    );
  });

  it('calls `getServerTLSOptions` with the correct parameters', () => {
    const server = new Server({});
    // easiest way to shim a tls.Server
    (server.listener as any).setSecureContext = jest.fn();
    const config: ISslConfig = { enabled: true };

    setTlsConfig(server, config);

    expect(getServerTLSOptionsMock).toHaveBeenCalledTimes(1);
    expect(getServerTLSOptionsMock).toHaveBeenCalledWith(config);
  });

  it('throws when called for a disabled SSL config', () => {
    const server = new Server({});
    // easiest way to shim a tls.Server
    (server.listener as any).setSecureContext = jest.fn();
    const config: ISslConfig = { enabled: false };

    getServerTLSOptionsMock.mockReturnValue(undefined);

    expect(() => setTlsConfig(server, config)).toThrowErrorMatchingInlineSnapshot(
      `"tried to apply a disabled SSL config"`
    );
  });

  it('calls `setSecureContext` on the underlying server', () => {
    const server = new Server({});
    // easiest way to shim a tls.Server
    const setSecureContextMock = jest.fn();
    (server.listener as any).setSecureContext = setSecureContextMock;
    const config: ISslConfig = { enabled: true };

    const tlsConfig = { someTlsConfig: true };
    getServerTLSOptionsMock.mockReturnValue(tlsConfig);

    setTlsConfig(server, config);

    expect(setSecureContextMock).toHaveBeenCalledTimes(1);
    expect(setSecureContextMock).toHaveBeenCalledWith(tlsConfig);
  });
});
