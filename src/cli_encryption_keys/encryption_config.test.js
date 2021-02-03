/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { EncryptionConfig } from './encryption_config';
import crypto from 'crypto';
import fs from 'fs';

describe('encryption key configuration', () => {
  let encryptionConfig = null;

  beforeEach(() => {
    jest.spyOn(fs, 'readFileSync').mockReturnValue('xpack.security.encryptionKey: foo');
    jest.spyOn(crypto, 'randomBytes').mockReturnValue('random-key');
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
