/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { mockLoggingSystem } from './config_deprecation.test.mocks';
import { createRoot } from '@kbn/core-test-helpers-kbn-server';
import { getFips } from 'crypto';

describe('configuration deprecations', () => {
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    if (root) {
      await root.shutdown();
    }
  });

  if (getFips() === 0) {
    it('should log one warning for default configuration, the http/tls deprecation warning', async () => {
      root = createRoot();

      await root.preboot();
      await root.setup();

      const logs = loggingSystemMock.collect(mockLoggingSystem);
      expect(logs.warn.flat()).toHaveLength(1);
      expect(logs.warn.flat()[0]).toEqual(
        'TLS is not enabled, or the HTTP protocol is set to HTTP/1. Enabling TLS and using HTTP/2 improves security and performance.'
      );
    });
  } else {
    it('fips is enabled and the default configuration has been overridden', () => {
      expect(getFips()).toBe(1);
    });
  }
});
