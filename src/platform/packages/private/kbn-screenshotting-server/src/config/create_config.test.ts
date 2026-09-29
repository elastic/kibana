/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type { Mocked } from 'vitest';

import type { Logger } from '@kbn/core/server';
import { createConfig } from './create_config';
import type { ConfigType } from './schema';

describe('createConfig$', () => {
  let logger: Mocked<Logger>;

  beforeEach(() => {
    logger = {
      debug: vi.fn(),
      get: vi.fn(() => logger),
      info: vi.fn(),
      warn: vi.fn(),
    } as unknown as typeof logger;
  });

  it('should use user-provided disableSandbox', async () => {
    const result = await createConfig(logger, {
      browser: { chromium: { disableSandbox: false } },
    } as ConfigType);

    expect(result).toHaveProperty('browser.chromium.disableSandbox', false);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('should provide a default for disableSandbox', async () => {
    const result = await createConfig(logger, { browser: { chromium: {} } } as ConfigType);

    expect(result).toHaveProperty('browser.chromium.disableSandbox', expect.any(Boolean));
    expect((logger.warn as any).mock.calls.length).toBe(0);
  });
});
