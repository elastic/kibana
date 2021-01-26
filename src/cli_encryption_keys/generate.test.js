/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { EncryptionConfig } from './encryption_config';
import { generate } from './generate';

import { Logger } from '../cli_plugin/lib/logger';

describe('encryption key generation', () => {
  const encryptionConfig = new EncryptionConfig();
  beforeEach(() => {
    Logger.prototype.log = jest.fn();
  });

  it('should generate a new encryption config', () => {
    const command = {
      force: false,
      interactive: false,
      quiet: false,
    };
    generate(encryptionConfig, command);
    const keys = Logger.prototype.log.mock.calls[6][0];
    expect(keys.search('xpack.encryptedSavedObjects.encryptionKey')).toBeGreaterThanOrEqual(0);
    expect(keys.search('xpack.reporting.encryptionKey')).toBeGreaterThanOrEqual(0);
    expect(keys.search('xpack.security.encryptionKey')).toBeGreaterThanOrEqual(0);
    expect(keys.search('foo.bar')).toEqual(-1);
  });

  it('should only output keys if the quiet flag is set', () => {
    generate(encryptionConfig, { quiet: true });
    const keys = Logger.prototype.log.mock.calls[0][0];
    const nextLog = Logger.prototype.log.mock.calls[1];
    expect(keys.search('xpack.encryptedSavedObjects.encryptionKey')).toBeGreaterThanOrEqual(0);
    expect(nextLog).toEqual(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
});
