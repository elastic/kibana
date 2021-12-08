/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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

  it('should not log deprecation warnings for default configuration that is not one of `logging.verbose`, `logging.quiet` or `logging.silent`', async () => {
    root = kbnTestServer.createRoot();

    await root.preboot();
    await root.setup();

    const logs = loggingSystemMock.collect(mockLoggingSystem);
    expect(logs.warn.flat()).toEqual(
      expect.arrayContaining([
        '"logging.silent" has been deprecated and will be removed in 8.0. Moving forward, you can use "logging.root.level:off" in your logging configuration.',
      ])
    );
  });

  it('should log deprecation warnings for core deprecations', async () => {
    root = kbnTestServer.createRoot({
      optimize: {
        lazy: true,
        lazyPort: 9090,
      },
    });

    await root.preboot();
    await root.setup();

    const logs = loggingSystemMock.collect(mockLoggingSystem);
    expect(logs.warn.flat()).toEqual(
      expect.arrayContaining([
        'You no longer need to configure "optimize.lazy".',
        'You no longer need to configure "optimize.lazyPort".',
        '"logging.silent" has been deprecated and will be removed in 8.0. Moving forward, you can use "logging.root.level:off" in your logging configuration.',
      ])
    );
  });
});
