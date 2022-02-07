import { stat } from 'fs/promises';
import os from 'os';
import del from 'del';
import { ValidConfigOptions } from '../options/options';
import * as childProcess from '../services/child-process-promisified';
import * as git from '../services/git';
import { getOraMock } from '../test/mocks';
import { maybeSetupRepo } from './maybeSetupRepo';
const fs = { stat };

describe('maybeSetupRepo', () => {
  let execSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.spyOn(os, 'homedir').mockReturnValue('/myHomeDir');

    execSpy = jest
      .spyOn(childProcess, 'exec')
      .mockResolvedValue({ stderr: '', stdout: '' });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('if an error occurs while cloning', () => {
    it('should delete repo', async () => {
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
          repoName: 'kibana',
          repoOwner: 'elastic',
        } as ValidConfigOptions)
      ).rejects.toThrowError('Simulated git clone failure');

      expect(del).toHaveBeenCalledWith(
        '/myHomeDir/.backport/repositories/elastic/kibana'
      );
    });
  });

  describe('while cloning the repo', () => {
    it('updates the progress', async () => {
      let onCloneComplete: () => void;
      let dataHandler: (chunk: any) => void;

      const oraMock = getOraMock();
      const spinnerTextSpy = jest.spyOn(oraMock, 'text', 'set');
      const spinnerSuccessSpy = jest.spyOn(oraMock, 'succeed');

      jest
        .spyOn(git, 'getSourceRepoPath')
        .mockResolvedValue('/path/to/source/repo');

      jest
        .spyOn(childProcess, 'execAsCallback')
        //@ts-expect-error
        .mockImplementation((cmdString, cmdOptions, onComplete) => {
          // callback should be called to finalize the operation
          if (onComplete) {
            //@ts-expect-error
            onCloneComplete = onComplete;
          }

          return {
            stderr: {
              on: (name, handler) => {
                dataHandler = handler;
              },
            },
          };
        });

      setTimeout(() => {
        dataHandler('Receiving objects:   1%');
        dataHandler('Receiving objects:   10%');
        dataHandler('Receiving objects:   20%');
        dataHandler('Receiving objects:   100%');
        dataHandler('Updating files:   1%');
        dataHandler('Updating files:   10%');
        dataHandler('Updating files:   20%');
        dataHandler('Updating files:   100%');
        onCloneComplete();
      }, 50);

      await maybeSetupRepo({
        repoName: 'kibana',
        repoOwner: 'elastic',
      } as ValidConfigOptions);

      expect(spinnerTextSpy.mock.calls.map((call) => call[0]))
        .toMatchInlineSnapshot(`
        Array [
          "0% Cloning repository from /path/to/source/repo (one-time operation)",
          "1% Cloning repository from /path/to/source/repo (one-time operation)",
          "9% Cloning repository from /path/to/source/repo (one-time operation)",
          "18% Cloning repository from /path/to/source/repo (one-time operation)",
          "90% Cloning repository from /path/to/source/repo (one-time operation)",
          "90% Cloning repository from /path/to/source/repo (one-time operation)",
          "91% Cloning repository from /path/to/source/repo (one-time operation)",
          "92% Cloning repository from /path/to/source/repo (one-time operation)",
          "100% Cloning repository from /path/to/source/repo (one-time operation)",
        ]
      `);

      expect(spinnerSuccessSpy).toHaveBeenCalledWith(
        '100% Cloning repository from /path/to/source/repo (one-time operation)'
      );
    });
  });

  describe('if repo already exists', () => {
    beforeEach(() => {
      // @ts-expect-error
      jest.spyOn(fs, 'stat').mockResolvedValue({ isDirectory: () => true });

      jest
        .spyOn(childProcess, 'execAsCallback')
        //@ts-expect-error
        .mockImplementation((cmdString, cmdOptions, callback) => {
          //@ts-expect-error
          callback();

          return {
            stderr: { on: () => null },
          };
        });
    });

    it('should re-create remotes for both source repo and fork', async () => {
      await maybeSetupRepo({
        accessToken: 'myAccessToken',
        authenticatedUsername: 'sqren_authenticated',
        repoName: 'kibana',
        repoOwner: 'elastic',
      } as ValidConfigOptions);

      expect(execSpy.mock.calls.map(([cmd]) => cmd)).toEqual([
        'git remote --verbose',
        'git remote rm origin',
        'git remote rm sqren_authenticated',
        'git remote add sqren_authenticated https://x-access-token:myAccessToken@github.com/sqren_authenticated/kibana.git',
        'git remote rm elastic',
        'git remote add elastic https://x-access-token:myAccessToken@github.com/elastic/kibana.git',
      ]);
    });
  });

  describe('if repo does not exists locally', () => {
    beforeEach(() => {
      // @ts-expect-error
      jest.spyOn(fs, 'stat').mockResolvedValue({ isDirectory: () => true });

      jest
        .spyOn(childProcess, 'execAsCallback')
        //@ts-expect-error
        .mockImplementation((cmdString, cmdOptions, callback) => {
          //@ts-expect-error
          callback();

          return {
            stderr: { on: () => null },
          };
        });
    });

    it('should clone it from github.com', async () => {
      await maybeSetupRepo({
        accessToken: 'myAccessToken',
        gitHostname: 'github.com',
        repoName: 'kibana',
        repoOwner: 'elastic',
      } as ValidConfigOptions);

      expect(childProcess.execAsCallback).toHaveBeenCalledWith(
        'git clone https://x-access-token:myAccessToken@github.com/elastic/kibana.git /myHomeDir/.backport/repositories/elastic/kibana --progress',
        expect.any(Object),
        expect.any(Function)
      );
    });
  });

  describe('if repo does exist locally', () => {
    beforeEach(() => {
      // @ts-expect-error
      jest.spyOn(fs, 'stat').mockResolvedValue({ isDirectory: () => true });

      jest
        .spyOn(git, 'getSourceRepoPath')
        .mockResolvedValue('/path/to/source/repo');

      jest
        .spyOn(childProcess, 'execAsCallback')
        //@ts-expect-error
        .mockImplementation((cmdString, cmdOptions, callback) => {
          //@ts-expect-error
          callback();

          return {
            stderr: { on: () => null },
          };
        });
    });

    it('should clone it from local folder', async () => {
      await maybeSetupRepo({
        repoName: 'kibana',
        repoOwner: 'elastic',
      } as ValidConfigOptions);

      expect(childProcess.execAsCallback).toHaveBeenCalledWith(
        'git clone /path/to/source/repo /myHomeDir/.backport/repositories/elastic/kibana --progress',
        expect.any(Object),
        expect.any(Function)
      );
    });
  });
});
