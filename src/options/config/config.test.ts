import * as fs from '../../services/fs-promisified';
import { mockConfigFiles } from '../../test/mockConfigFiles';
import { getOptionsFromConfigFiles } from './config';

describe('getOptionsFromConfigFiles', () => {
  let res: Awaited<ReturnType<typeof getOptionsFromConfigFiles>>;

  beforeEach(async () => {
    jest.spyOn(fs, 'writeFile').mockResolvedValueOnce(undefined);
    jest.spyOn(fs, 'chmod').mockResolvedValue();
    mockConfigFiles({
      globalConfig: { accessToken: 'abc', editor: 'vim' },
      projectConfig: { repoName: 'kibana', repoOwner: 'elastic' },
    });

    res = await getOptionsFromConfigFiles({
      optionsFromCliArgs: {},
      optionsFromModule: {},
      defaultConfigOptions: { ci: false },
    });
  });

  it('should return values from config files', () => {
    expect(res).toEqual({
      accessToken: 'abc',
      editor: 'vim',
      repoName: 'kibana',
      repoOwner: 'elastic',
    });
  });
});
