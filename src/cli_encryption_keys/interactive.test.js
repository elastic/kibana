/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { EncryptionConfig } from './encryption_config';
import { generate } from './generate';

import { Logger } from '../cli_plugin/lib/logger';
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
