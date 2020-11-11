import { ConfigOptions } from './ConfigOptions';
import { getOptionsFromCliArgs } from './cliArgs';

describe('getOptionsFromCliArgs', () => {
  it('should merge config and cli options', () => {
    const configOptions: ConfigOptions = {
      accessToken: 'myAccessToken',
      all: false,
      fork: true,
      gitHostname: 'github.com',
      githubApiBaseUrlV3: 'https://api.github.com',
      githubApiBaseUrlV4: 'https://api.github.com/graphql',
      maxNumber: 10,
      multipleBranches: true,
      multipleCommits: false,
      noVerify: true,
      prTitle: 'myPrTitle',
      sourcePRLabels: [],
      targetBranchChoices: [],
      targetPRLabels: [],
      upstream: 'elastic/kibana',
      username: 'sqren',
    };

    const argv = [
      '--branch',
      '6.0',
      '--branch',
      '6.1',
      '--upstream',
      'backport-org/backport-demo',
      '--all',
      '--username',
      'sqren',
    ];

    const res = getOptionsFromCliArgs(configOptions, argv);

    expect(res).toEqual({
      accessToken: 'myAccessToken',
      all: true,
      assignees: [],
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
      prTitle: 'myPrTitle',
      resetAuthor: false,
      sha: undefined,
      sourcePRLabels: [],
      targetBranchChoices: [],
      targetBranches: ['6.0', '6.1'],
      targetPRLabels: [],
      upstream: 'backport-org/backport-demo',
      username: 'sqren',
      verbose: false,
    });
  });

  it('should accept both camel-case and dashed-case and convert them to camel cased', () => {
    const configOptions: ConfigOptions = {};
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

  it('should support all variations of --source-pr-labels', () => {
    const configOptions: ConfigOptions = {};
    const argv = [
      '--sourcePRLabels',
      'label a',
      '--sourcePrLabels',
      'label b',
      '--source-pr-labels',
      'label c',
      '--sourcePRLabel',
      'label d',
      '--sourcePrLabel',
      'label e',
      '--source-pr-label',
      'label f',
    ];

    const res = getOptionsFromCliArgs(configOptions, argv);
    expect(res.sourcePRLabels).toEqual([
      'label a',
      'label b',
      'label c',
      'label d',
      'label e',
      'label f',
    ]);
  });

  describe('pullNumber', () => {
    it('should accept `--pr` alias but only return the full representation (`pullNumber`)', () => {
      const configOptions: ConfigOptions = {};
      const argv = ['--pr', '1337'];

      const res = getOptionsFromCliArgs(configOptions, argv);

      expect(res.pullNumber).toEqual(1337);

      //@ts-expect-error
      expect(res.pr).toBe(undefined);
    });
  });

  describe('autoAssign', () => {
    it('should set assignees to current user if `autoAssign` is true', () => {
      const configOptions: ConfigOptions = { username: 'sqren' };
      const argv = ['--auto-assign'];

      const res = getOptionsFromCliArgs(configOptions, argv);

      expect(res.assignees).toEqual(['sqren']);
    });
  });

  describe('assignees', () => {
    it('should set assignees', () => {
      const configOptions: ConfigOptions = { username: 'sqren' };
      const argv = ['--assignees', 'john'];
      const res = getOptionsFromCliArgs(configOptions, argv);
      expect(res.assignees).toEqual(['john']);
    });
  });

  describe('multipleBranches', () => {
    it('should be settable', () => {
      const configOptions: ConfigOptions = { multipleBranches: false };
      const argv = [] as const;
      const res = getOptionsFromCliArgs(configOptions, argv);
      expect(res.multipleBranches).toBe(false);
    });

    it('should respect `multiple` option', () => {
      const configOptions: ConfigOptions = { multipleBranches: false };
      const argv = ['--multiple'];
      const res = getOptionsFromCliArgs(configOptions, argv);
      expect(res.multipleBranches).toBe(true);
    });
  });

  describe('noVerify', () => {
    it('should be settable', () => {
      const configOptions: ConfigOptions = { noVerify: false };
      const argv = [] as const;
      const res = getOptionsFromCliArgs(configOptions, argv);
      expect(res.noVerify).toBe(false);
    });

    it('should be flipped by `verify`', () => {
      const configOptions: ConfigOptions = { noVerify: false };
      const argv = ['--verify'];
      const res = getOptionsFromCliArgs(configOptions, argv);
      expect(res.noVerify).toBe(true);
    });
  });

  describe('mainline', () => {
    it('should default to 1', () => {
      const configOptions: ConfigOptions = {};
      const argv = ['--mainline'];
      const res = getOptionsFromCliArgs(configOptions, argv);
      expect(res.mainline).toEqual(1);
    });

    it('should accept numbers', () => {
      const configOptions: ConfigOptions = {};
      const argv = ['--mainline', '2'];
      const res = getOptionsFromCliArgs(configOptions, argv);
      expect(res.mainline).toEqual(2);
    });
  });

  describe('targetBranches', () => {
    it('should not coerce 6.0 to 6', () => {
      const configOptions: ConfigOptions = {};
      const argv = ['-b', '6.0'];
      const res = getOptionsFromCliArgs(configOptions, argv);
      expect(res.targetBranches).toEqual(['6.0']);
    });
  });

  describe('targetBranchChoices', () => {
    it('should support objects', () => {
      const configOptions: ConfigOptions = {
        targetBranchChoices: [{ name: '7.x', checked: false }],
      };
      const argv = [] as const;
      const res = getOptionsFromCliArgs(configOptions, argv);
      expect(res.targetBranchChoices).toEqual([
        { name: '7.x', checked: false },
      ]);
    });

    it('should convert primitive values to objects', () => {
      const configOptions: ConfigOptions = {};
      const argv = ['--target-branch-choices', '8.x'];
      const res = getOptionsFromCliArgs(configOptions, argv);
      expect(res.targetBranchChoices).toEqual([
        { name: '8.x', checked: false },
      ]);
    });
  });
});
