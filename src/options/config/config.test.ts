import { PromiseReturnType } from '../../types/PromiseReturnType';
import { getOptionsFromConfigFiles } from './config';

describe('getOptionsFromConfigFiles', () => {
  let res: PromiseReturnType<typeof getOptionsFromConfigFiles>;

  beforeEach(async () => {
    res = await getOptionsFromConfigFiles();
  });

  it('should return values from (mock) config files incl. default values', () => {
    expect(res).toEqual({
      accessToken: 'myAccessToken',
      all: false,
      assignees: [],
      autoAssign: false,
      autoMerge: false,
      autoMergeMethod: 'merge',
      ci: false,
      dryRun: false,
      fork: true,
      gitHostname: 'github.com',
      githubApiBaseUrlV3: 'https://api.github.com',
      githubApiBaseUrlV4: 'https://api.github.com/graphql',
      maxNumber: 10,
      multipleBranches: true,
      multipleCommits: false,
      noVerify: true,
      prTitle: '[{targetBranch}] {commitMessages}',
      resetAuthor: false,
      sourcePRLabels: [],
      targetBranchChoices: ['6.0', '5.9'],
      targetBranches: [],
      targetPRLabels: [],
      upstream: 'backport-org/backport-demo',
      username: 'sqren',
      verbose: false,
    });
  });
});
