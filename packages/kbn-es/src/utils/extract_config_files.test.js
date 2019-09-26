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

jest.mock('fs', () => ({
  readFileSync: jest.fn(),
  existsSync: jest.fn().mockImplementation(() => true),
  writeFileSync: jest.fn(),
}));

const { extractConfigFiles } = require('./extract_config_files');
const fs = require('fs');

afterEach(() => {
  jest.clearAllMocks();
});

afterAll(() => {
  jest.restoreAllMocks();
});

test('returns config with local paths', () => {
  const config = extractConfigFiles(['path=/data/foo.yml'], '/es');

  expect(config[0]).toBe('path=foo.yml');
});

test('copies file', () => {
  extractConfigFiles(['path=/data/foo.yml'], '/es');

  expect(fs.readFileSync.mock.calls[0][0]).toEqual('/data/foo.yml');
  expect(fs.writeFileSync.mock.calls[0][0]).toEqual('/es/config/foo.yml');
});

test('ignores file which does not exist', () => {
  fs.existsSync = () => false;
  extractConfigFiles(['path=/data/foo.yml'], '/es');

  expect(fs.readFileSync).not.toHaveBeenCalled();
  expect(fs.writeFileSync).not.toHaveBeenCalled();
});

test('ignores non-paths', () => {
  const config = extractConfigFiles(['foo=bar', 'foo.bar=baz'], '/es');

  expect(config).toEqual(['foo=bar', 'foo.bar=baz']);
});

test('keeps regular expressions intact', () => {
  fs.existsSync = () => false;
  const config = extractConfigFiles(['foo=bar', 'foo.bar=/https?://127.0.0.1(:[0-9]+)?/'], '/es');

  expect(config).toEqual(['foo=bar', 'foo.bar=/https?://127.0.0.1(:[0-9]+)?/']);
});

test('ignores directories', () => {
  fs.existsSync = () => true;
  const config = extractConfigFiles(['path=/data/foo.yml', 'foo.bar=/data/bar'], '/es');

  expect(config).toEqual(['path=foo.yml', 'foo.bar=/data/bar']);
});
