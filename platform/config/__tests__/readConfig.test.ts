const mockReadFileSync = jest.fn();

jest.mock('fs', () => ({
  readFileSync: mockReadFileSync
}));

import { getConfigFromFile } from '../readConfig';

test('reads yaml from file system and parses to json', () => {
  const yaml = 'key: value';
  mockReadFileSync.mockImplementation(() => yaml);

  expect(getConfigFromFile('./config.yml')).toEqual({
    key: 'value'
  });
});

test('reads from specified config file if given', () => {
  const yaml = '';
  mockReadFileSync.mockImplementation(() => yaml);

  getConfigFromFile('./some-other-config-file.yml');

  expect(mockReadFileSync).toHaveBeenLastCalledWith('./some-other-config-file.yml', 'utf8');
});
