import { PromiseReturnType } from '../../types/PromiseReturnType';
import { getOptionsFromConfigFiles } from './config';

describe('getOptionsFromConfigFiles', () => {
  let res: PromiseReturnType<typeof getOptionsFromConfigFiles>;

  beforeEach(async () => {
    res = await getOptionsFromConfigFiles();
  });

  it('should return default config values', () => {
    expect(res).toEqual({
      accessToken: 'myAccessToken',
      targetBranchChoices: ['6.0', '5.9'],
      upstream: 'backport-org/backport-demo',
      username: 'sqren',
    });
  });
});
