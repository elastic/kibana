const { extractConfigFiles } = require('./extract_config_files');
const mockFs = require('mock-fs');
const fs = require('fs');

beforeEach(() => {
  mockFs({
    '/data': {
      'foo.yml': '',
    },
    '/es': {},
  });
});

afterEach(() => {
  mockFs.restore();
});

test('returns config with local paths', () => {
  const config = extractConfigFiles(['path=/data/foo.yml'], '/es');

  expect(config[0]).toBe('path=foo.yml');
});

test('copies file', () => {
  extractConfigFiles(['path=/data/foo.yml'], '/es');

  expect(fs.existsSync('/es/config/foo.yml')).toBe(true);
  expect(fs.existsSync('/data/foo.yml')).toBe(true);
});

test('ignores non-paths', () => {
  const config = extractConfigFiles(['foo=bar', 'foo.bar=baz'], '/es');

  expect(config).toEqual(['foo=bar', 'foo.bar=baz']);
});

test('ignores directories', () => {
  const config = extractConfigFiles(
    ['path=/data/foo.yml', 'foo.bar=/data/bar'],
    '/es'
  );

  expect(config).toEqual(['path=foo.yml', 'foo.bar=/data/bar']);
});
