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
