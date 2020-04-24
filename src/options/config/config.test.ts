import { PromiseReturnType } from '../../types/PromiseReturnType';
import { getOptionsFromConfigFiles } from './config';

describe('getOptionsFromConfigFiles', () => {
  let res: PromiseReturnType<typeof getOptionsFromConfigFiles>;

  beforeEach(async () => {
    res = await getOptionsFromConfigFiles();
  });

  it('should return correct config', () => {
    expect(res).toEqual({
      accessToken: 'myAccessToken',
      all: false,
      githubApiBaseUrlV3: 'https://api.github.com',
      githubApiBaseUrlV4: 'https://api.github.com/graphql',
      sourcePRLabels: [],
      targetBranchChoices: [
        { checked: false, name: '6.0' },
        { checked: false, name: '5.9' },
      ],
      fork: true,
      gitHostname: 'github.com',
      targetPRLabels: [],
      multiple: false,
      multipleBranches: true,
      multipleCommits: false,
      prTitle: '[{targetBranch}] {commitMessages}',
      upstream: 'elastic/backport-demo',
      username: 'sqren',
    });
  });
});
