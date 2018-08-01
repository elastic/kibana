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

import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

import { checkUpdates } from './check_l10n_updates';

const unlinkAsync = promisify(fs.unlink);
const accessAsync = promisify(fs.access);

const log = {
  success: jest.fn(),
};

const plugin = path.resolve(__dirname, '__fixtures__', 'check_l10n_updates', 'test_plugin');
const cachePath = path.resolve(plugin, 'translations', 'messages_cache.json');
const cacheFilesDir = path.resolve(
  __dirname,
  '__fixtures__',
  'check_l10n_updates',
  'messages_cache_files'
);

async function copyFile(source, dest) {
  return new Promise((resolve, reject) => {
    const reader = fs.createReadStream(source);
    reader.pipe(fs.createWriteStream(dest));

    reader.on('end', () => {
      resolve();
    });

    reader.on('error', error => {
      reject(error);
    });
  });
}

describe('dev/i18n/check_l10n_updates', () => {
  beforeEach(() => {
    log.success.mockClear();
  });

  afterEach(async () => {
    await unlinkAsync(cachePath);
  });

  it('creates messages_cache.json', async () => {
    await checkUpdates(plugin, log);

    expect(log.success).toBeCalledWith(
      `New messages ids in ${plugin}:\ntest_plugin.id_1, test_plugin.id_2`
    );

    await accessAsync(cachePath);
  });

  it('logs out ids of new messages', async () => {
    await copyFile(path.join(cacheFilesDir, 'messages_cache_1.json'), cachePath);

    await checkUpdates(plugin, log);
    expect(log.success).toBeCalledWith(`New messages ids in ${plugin}:\ntest_plugin.id_2`);
  });

  it('logs out ids of removed messages', async () => {
    await copyFile(path.join(cacheFilesDir, 'messages_cache_2.json'), cachePath);

    await checkUpdates(plugin, log);
    expect(log.success).toBeCalledWith(`Removed messages ids from ${plugin}:\ntest_plugin.id_3`);
  });

  it('logs out ids of new and removed messages', async () => {
    await copyFile(path.join(cacheFilesDir, 'messages_cache_3.json'), cachePath);

    await checkUpdates(plugin, log);
    expect(log.success.mock.calls).toEqual([
      [`New messages ids in ${plugin}:\ntest_plugin.id_2`],
      [`Removed messages ids from ${plugin}:\ntest_plugin.id_4`],
    ]);
  });
});
