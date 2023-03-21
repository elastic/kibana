/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EncryptionConfig } from './encryption_config';
import { generate } from './generate';

import { Logger } from '../cli/logger';
import * as prompt from '../cli_keystore/utils/prompt';
import fs from 'fs';
import crypto from 'crypto';

describe('encryption key generation interactive', () => {
  const encryptionConfig = new EncryptionConfig();
  beforeEach(() => {
    Logger.prototype.log = jest.fn();
  });

  it('should prompt the user to write keys if the interactive flag is set', async () => {
    jest
      .spyOn(prompt, 'confirm')
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    jest.spyOn(prompt, 'question');

    await generate(encryptionConfig, { interactive: true });
    expect(prompt.confirm.mock.calls).toEqual([
      ['Set xpack.encryptedSavedObjects.encryptionKey?'],
      ['Set xpack.reporting.encryptionKey?'],
      ['Set xpack.security.encryptionKey?'],
      ['Save generated keys to a sample Kibana configuration file?'],
    ]);
    expect(prompt.question).not.toHaveBeenCalled();
  });

  it('should write to disk partial keys', async () => {
    jest
      .spyOn(prompt, 'confirm')
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    jest.spyOn(prompt, 'question').mockResolvedValue('/foo/bar');
    jest.spyOn(crypto, 'randomBytes').mockReturnValue('random-key');
    fs.writeFileSync = jest.fn();
    await generate(encryptionConfig, { interactive: true });
    expect(fs.writeFileSync.mock.calls).toMatchSnapshot();
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });
});
