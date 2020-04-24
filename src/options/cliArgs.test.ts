import { getOptionsFromCliArgs } from './cliArgs';
import { OptionsFromConfigFiles } from './config/config';

describe('getOptionsFromCliArgs', () => {
  it('should return correct options', () => {
    const configOptions = {
      accessToken: 'myAccessToken',
      all: false,
      githubApiBaseUrlV3: 'https://api.github.com',
      githubApiBaseUrlV4: 'https://api.github.com/graphql',
      sourcePRLabels: [],
      targetBranchChoices: [],
      fork: true,
      gitHostname: 'github.com',
      targetPRLabels: [],
      multiple: false,
      multipleBranches: true,
      multipleCommits: false,
      prTitle: 'myPrTitle',
      upstream: 'elastic/kibana',
      username: 'sqren',
    };

    const argv = [
      '--branch',
      '6.0',
      '--branch',
      '6.1',
      '--upstream',
      'sqren/backport-demo',
      '--all',
      '--username',
      'sqren',
    ];

    const res = getOptionsFromCliArgs(configOptions, argv);

    expect(res).toEqual({
      accessToken: 'myAccessToken',
      all: true,
      githubApiBaseUrlV3: 'https://api.github.com',
      githubApiBaseUrlV4: 'https://api.github.com/graphql',
      sourcePRLabels: [],
      dryRun: false,
      targetBranches: ['6.0', '6.1'],
      targetBranchChoices: [],
      fork: true,
      gitHostname: 'github.com',
      targetPRLabels: [],
      multiple: false,
      multipleBranches: true,
      multipleCommits: false,
      prTitle: 'myPrTitle',
      resetAuthor: false,
      sha: undefined,
      upstream: 'sqren/backport-demo',
      username: 'sqren',
      verbose: false,
    });
  });

  it('should accept both camel-case and dashed-case and convert them to camel cased', () => {
    const configOptions = {} as OptionsFromConfigFiles;
    const argv = [
      '--access-token',
      'my access token',
      '--githubApiBaseUrlV3',
      'my api hostname',
    ];

    const res = getOptionsFromCliArgs(configOptions, argv);

    expect(res.accessToken).toEqual('my access token');
    expect('access-token' in res).toEqual(false);
    expect(res.githubApiBaseUrlV3).toEqual('my api hostname');
    expect('api-hostname' in res).toEqual(false);
  });

  it('should accept aliases (--pr) but only return the full name (--pullNumber) in the result', () => {
    const configOptions = {} as OptionsFromConfigFiles;
    const argv = ['--pr', '1337'];

    const res = getOptionsFromCliArgs(configOptions, argv);

    expect(res.pullNumber).toEqual(1337);
    expect('pr' in res).toEqual(false);
  });
});
