/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { mockLoggingSystem } from './config_deprecation.test.mocks';
import { loggingSystemMock } from '../../logging/logging_system.mock';
import * as kbnTestServer from '../../../test_helpers/kbn_server';

describe('configuration deprecations', () => {
  let root: ReturnType<typeof kbnTestServer.createRoot>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    if (root) {
      await root.shutdown();
    }
  });

  it('should not log deprecation warnings for default configuration', async () => {
    root = kbnTestServer.createRoot();

    await root.setup();

    const logs = loggingSystemMock.collect(mockLoggingSystem);
    expect(logs.warn.flat()).toMatchInlineSnapshot(`Array []`);
  });

  it('should log deprecation warnings for core deprecations', async () => {
    root = kbnTestServer.createRoot({
      optimize: {
        lazy: true,
        lazyPort: 9090,
      },
    });

    await root.setup();

    const logs = loggingSystemMock.collect(mockLoggingSystem);
    expect(logs.warn.flat()).toMatchInlineSnapshot(`
      Array [
        "optimize.lazy is deprecated and is no longer used",
        "optimize.lazyPort is deprecated and is no longer used",
      ]
    `);
  });
});
