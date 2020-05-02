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
      all: false,
      fork: true,
      gitHostname: 'github.com',
      githubApiBaseUrlV3: 'https://api.github.com',
      githubApiBaseUrlV4: 'https://api.github.com/graphql',
      maxNumber: 10,
      multiple: false,
      multipleBranches: true,
      multipleCommits: false,
      noVerify: true,
      prTitle: '[{targetBranch}] {commitMessages}',
      sourcePRLabels: [],
      targetBranchChoices: [
        { checked: false, name: '6.0' },
        { checked: false, name: '5.9' },
      ],
      targetPRLabels: [],
      upstream: 'elastic/backport-demo',
      username: 'sqren',
    });
  });
});
