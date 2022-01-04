import { mockConfigFiles } from '../../test/mockConfigFiles';
import { getOptionsFromConfigFiles } from './config';

describe('getOptionsFromConfigFiles', () => {
  let res: Awaited<ReturnType<typeof getOptionsFromConfigFiles>>;

  beforeEach(async () => {
    mockConfigFiles({
      globalConfig: { accessToken: 'abc', editor: 'vim' },
      projectConfig: { repoName: 'kibana', repoOwner: 'elastic' },
    });

    res = await getOptionsFromConfigFiles();
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
