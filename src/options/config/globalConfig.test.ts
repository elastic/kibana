import os from 'os';
import makeDir from 'make-dir';
import * as fs from '../../services/fs-promisified';
import { getGlobalConfig, createGlobalConfigIfNotExist } from './globalConfig';

describe('config', () => {
  afterEach(() => jest.clearAllMocks());

  beforeEach(() => {
    jest.spyOn(os, 'homedir').mockReturnValue('/myHomeDir');
  });

  describe('getGlobalConfig', () => {
    let res: Awaited<ReturnType<typeof getGlobalConfig>>;
    beforeEach(async () => {
      jest.spyOn(fs, 'chmod').mockResolvedValueOnce();
      jest.spyOn(fs, 'writeFile').mockResolvedValueOnce();
      jest.spyOn(fs, 'readFile').mockResolvedValueOnce(
        JSON.stringify({
          accessToken: 'myAccessToken',
        })
      );
      res = await getGlobalConfig();
    });

    it("should create config if it doesn't exist", () => {
      expect(fs.writeFile).toHaveBeenCalledWith(
        '/myHomeDir/.backport/config.json',
        expect.any(String),
        { flag: 'wx', mode: 384 }
      );
    });

    it("should create .backport folder if it doesn't exist", () => {
      expect(makeDir).toHaveBeenCalledWith('/myHomeDir/.backport');
    });

    it('should load config', () => {
      expect(fs.readFile).toHaveBeenCalledWith(
        '/myHomeDir/.backport/config.json',
        'utf8'
      );
    });

    it('should return config', () => {
      expect(res).toEqual({
        accessToken: 'myAccessToken',
      });
    });
  });

  describe('createGlobalConfigIfNotExist', () => {
    it('should create config and succeed', async () => {
      jest.spyOn(fs, 'writeFile').mockResolvedValueOnce(undefined);
      const didCreate = await createGlobalConfigIfNotExist(
        '/path/to/globalConfig',
        'myConfigTemplate'
      );

      expect(didCreate).toEqual(true);

      expect(fs.writeFile).toHaveBeenCalledWith(
        '/path/to/globalConfig',
        expect.stringContaining('myConfigTemplate'),
        { flag: 'wx', mode: 384 }
      );
    });

    it('should not fail if config already exists', async () => {
      const err = new Error();
      (err as any).code = 'EEXIST';
      jest.spyOn(fs, 'writeFile').mockRejectedValueOnce(err);

      const didCreate = await createGlobalConfigIfNotExist(
        'myPath',
        'myConfigTemplate'
      );

      expect(didCreate).toEqual(false);
    });
  });
});
