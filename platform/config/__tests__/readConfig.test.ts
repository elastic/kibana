const mockReadFileSync = jest.fn();

jest.mock('fs', () => ({
  readFileSync: mockReadFileSync
}));

import { getConfigFromFile } from '../readConfig';

test('reads yaml from file system and parses to json', () => {
  const yaml = 'key: value';
  mockReadFileSync.mockImplementation(() => yaml);

  expect(getConfigFromFile(undefined, './config.yml')).toEqual({
    key: 'value'
  });
});

test('reads from default config file if no other config file specified', () => {
  const yaml = '';
  mockReadFileSync.mockImplementation(() => yaml);

  getConfigFromFile(undefined, './config.yml');

  expect(mockReadFileSync).toHaveBeenLastCalledWith('./config.yml', 'utf8');
});

test('reads from specified config file if given', () => {
  const yaml = '';
  mockReadFileSync.mockImplementation(() => yaml);

  getConfigFromFile('./some-other-config-file.yml', './config.yml');

  expect(mockReadFileSync).toHaveBeenLastCalledWith('./some-other-config-file.yml', 'utf8');
});
