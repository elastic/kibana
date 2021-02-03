/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
