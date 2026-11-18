/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import {
  EMULATOR_CA_DIR_ENV,
  EMULATOR_HOST_ENV,
  EMULATOR_PORT_ENV,
  resolveEmulatorLocation,
} from './emulator_location';

const repoRoot = path.join(path.sep, 'repo');

describe('resolveEmulatorLocation', () => {
  it('defaults to a local proxy and a CA under the repository', () => {
    expect(resolveEmulatorLocation({ repoRoot, env: {} })).toEqual({
      host: '127.0.0.1',
      port: 5690,
      proxyUrl: 'http://127.0.0.1:5690',
      caDirectory: path.join(repoRoot, 'data', 'connector_emulate'),
      caCertFile: path.join(repoRoot, 'data', 'connector_emulate', 'ca.crt'),
      caKeyFile: path.join(repoRoot, 'data', 'connector_emulate', 'ca.key'),
    });
  });

  it('is moved by the environment', () => {
    const location = resolveEmulatorLocation({
      repoRoot,
      env: {
        [EMULATOR_HOST_ENV]: 'emulator.internal',
        [EMULATOR_PORT_ENV]: '6001',
        [EMULATOR_CA_DIR_ENV]: 'target/ca',
      },
    });

    expect(location.proxyUrl).toBe('http://emulator.internal:6001');
    expect(location.caCertFile).toBe(path.join(repoRoot, 'target', 'ca', 'ca.crt'));
  });

  it('takes an absolute CA directory as it is', () => {
    const absolute = path.join(path.sep, 'tmp', 'ca');

    expect(
      resolveEmulatorLocation({ repoRoot, env: { [EMULATOR_CA_DIR_ENV]: absolute } }).caDirectory
    ).toBe(absolute);
  });

  it('brackets an IPv6 host in the proxy URL', () => {
    expect(
      resolveEmulatorLocation({ repoRoot, env: { [EMULATOR_HOST_ENV]: '::1' } }).proxyUrl
    ).toBe('http://[::1]:5690');
  });

  it.each(['abc', '-1', '70000', '1.5'])('rejects the port %s', (port) => {
    expect(() => resolveEmulatorLocation({ repoRoot, env: { [EMULATOR_PORT_ENV]: port } })).toThrow(
      `${EMULATOR_PORT_ENV} must be a port number, got ${port}`
    );
  });
});
