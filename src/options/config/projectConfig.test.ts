import findUp from 'find-up';
import * as fs from '../../services/fs-promisified';
import { PromiseReturnType } from '../../types/PromiseReturnType';
import { getProjectConfig } from './projectConfig';

describe('getProjectConfig', () => {
  afterEach(() => jest.clearAllMocks());

  describe('when projectConfig is valid', () => {
    let projectConfig: PromiseReturnType<typeof getProjectConfig>;
    beforeEach(async () => {
      jest
        .spyOn(fs, 'readFile')
        .mockResolvedValueOnce(
          JSON.stringify({ upstream: 'elastic/kibana', branches: ['6.x'] })
        );

      projectConfig = await getProjectConfig();
    });

    it('should call findUp', () => {
      expect(findUp).toHaveBeenCalledWith('.backportrc.json');
    });

    it('should return config with branches', () => {
      expect(projectConfig).toEqual({
        branches: ['6.x'],
        upstream: 'elastic/kibana',
      });
    });
  });

  describe('when projectConfig is empty', () => {
    it('should return empty config', async () => {
      jest.spyOn(fs, 'readFile').mockResolvedValueOnce('{}');
      const projectConfig = await getProjectConfig();
      expect(projectConfig).toEqual({ targetBranchChoices: undefined });
    });
  });

  describe('when projectConfig is missing', () => {
    it('should return empty config', async () => {
      (findUp as any as jest.SpyInstance).mockReturnValueOnce(undefined);
      const projectConfig = await getProjectConfig();
      expect(projectConfig).toEqual(undefined);
    });
  });
});
