import os from 'os';
import { ValidConfigOptions } from '../options/options';
import { getGlobalConfigPath, getRepoPath } from '../services/env';

describe('env', () => {
  beforeEach(() => {
    jest.spyOn(os, 'homedir').mockReturnValue('/myHomeDir');
  });

  test('getGlobalConfigPath', () => {
    expect(getGlobalConfigPath()).toBe('/myHomeDir/.backport/config.json');
  });

  test('getRepoPath', () => {
    expect(
      getRepoPath({
        repoOwner: 'elastic',
        repoName: 'kibana',
      } as ValidConfigOptions)
    ).toBe('/myHomeDir/.backport/repositories/elastic/kibana');
  });
});
