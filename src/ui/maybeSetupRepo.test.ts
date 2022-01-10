import os from 'os';
import del from 'del';
import { ValidConfigOptions } from '../options/options';
import * as childProcess from '../services/child-process-promisified';
import * as fs from '../services/fs-promisified';
import { maybeSetupRepo } from './maybeSetupRepo';

describe('maybeSetupRepo', () => {
  let execSpy: jest.SpyInstance;
  beforeEach(() => {
    jest.spyOn(os, 'homedir').mockReturnValue('/myHomeDir');
    execSpy = jest
      .spyOn(childProcess, 'exec')
      .mockResolvedValue({ stderr: '', stdout: '' });
  });

  it('should delete repo if an error occurs', async () => {
    expect.assertions(2);

    execSpy = jest
      .spyOn(childProcess, 'execAsCallback')
      .mockImplementation((cmd) => {
        if (cmd.startsWith('git clone')) {
          throw new Error('Simulated git clone failure');
        }

        throw new Error('unknown error');
      });

    await expect(
      maybeSetupRepo({
        accessToken: 'myAccessToken',
        gitHostname: 'github.com',
        repoName: 'kibana',
        repoOwner: 'elastic',
      } as ValidConfigOptions)
    ).rejects.toThrowError('Simulated git clone failure');

    expect(del).toHaveBeenCalledWith(
      '/myHomeDir/.backport/repositories/elastic/kibana'
    );
  });

  describe('if repo already exists', () => {
    beforeEach(() => {
      // @ts-expect-error
      jest.spyOn(fs, 'stat').mockResolvedValue({ isDirectory: () => true });
    });

    it('should re-create remotes for both source repo and fork', async () => {
      await maybeSetupRepo({
        accessToken: 'myAccessToken',
        authenticatedUsername: 'sqren_authenticated',
        gitHostname: 'github.com',
        repoName: 'kibana',
        repoOwner: 'elastic',
      } as ValidConfigOptions);

      expect(execSpy.mock.calls.map(([cmd]) => cmd)).toEqual([
        'git remote rm origin',
        'git remote rm sqren_authenticated',
        'git remote add sqren_authenticated https://x-access-token:myAccessToken@github.com/sqren_authenticated/kibana.git',
        'git remote rm elastic',
        'git remote add elastic https://x-access-token:myAccessToken@github.com/elastic/kibana.git',
      ]);
    });
  });
});
