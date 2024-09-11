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

  it('should not log deprecation warnings for default configuration', async () => {
    root = createRoot();

    await root.preboot();
    await root.setup();

    const logs = loggingSystemMock.collect(mockLoggingSystem);
    expect(logs.warn.flat()).toHaveLength(0);
  });
});
