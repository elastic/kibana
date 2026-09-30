/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

import { EncryptionConfig } from './encryption_config';
import crypto from 'crypto';
import fs from 'fs';

// `encryption_config.js` imports `readFileSync` by name; forward it to the default export so stubs on `fs.readFileSync` apply
vi.mock('fs', async (importOriginal) => {
  const { default: actualFs } = await importOriginal();
  return {
    ...actualFs,
    default: actualFs,
    get readFileSync() {
      return actualFs.readFileSync;
    },
  };
});

describe('encryption key configuration', () => {
  let encryptionConfig = null;

  beforeEach(() => {
    vi.spyOn(fs, 'readFileSync').mockReturnValueOnce('xpack.security.encryptionKey: foo');
    vi.spyOn(crypto, 'randomBytes').mockReturnValue('random-key');
    encryptionConfig = new EncryptionConfig();
  });
  it('should be able to check for encryption keys', () => {
    expect(encryptionConfig._hasEncryptionKey('xpack.reporting.encryptionKey')).toEqual(false);
    expect(encryptionConfig._hasEncryptionKey('xpack.security.encryptionKey')).toEqual(true);
  });

  it('should be able to get encryption keys', () => {
    expect(encryptionConfig._getEncryptionKey('xpack.reporting.encryptionKey')).toBeUndefined();
    expect(encryptionConfig._getEncryptionKey('xpack.security.encryptionKey')).toEqual('foo');
  });

  it('should generate a key', () => {
    expect(encryptionConfig._generateEncryptionKey()).toEqual('random-key');
  });

  it('should only generate unset keys', () => {
    const output = encryptionConfig.generate({ force: false });
    expect(output['xpack.security.encryptionKey']).toEqual(undefined);
    expect(output['xpack.reporting.encryptionKey']).toEqual('random-key');
  });

  it('should regenerate all keys if the force flag is set', () => {
    const output = encryptionConfig.generate({ force: true });
    expect(output['xpack.security.encryptionKey']).toEqual('random-key');
    expect(output['xpack.reporting.encryptionKey']).toEqual('random-key');
    expect(output['xpack.encryptedSavedObjects.encryptionKey']).toEqual('random-key');
  });

  it('should set encryptedObjects and reporting with a default configuration', () => {
    const output = encryptionConfig.generate({});
    expect(output['xpack.security.encryptionKey']).toBeUndefined();
    expect(output['xpack.encryptedSavedObjects.encryptionKey']).toEqual('random-key');
    expect(output['xpack.reporting.encryptionKey']).toEqual('random-key');
  });
});
