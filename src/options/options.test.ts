import axios from 'axios';
import { OptionsFromCliArgs } from './cliArgs';
import { validateRequiredOptions, getOptions } from './options';

describe('getOptions', () => {
  function getPerformStartChecksSpy({
    defaultBranch,
    refName,
  }: {
    defaultBranch: string;
    refName?: 'backport';
  }) {
    // startup check request
    return jest.spyOn(axios, 'post').mockResolvedValueOnce({
      data: {
        data: {
          repository: {
            ref: {
              name: refName,
            },
            defaultBranchRef: { name: defaultBranch },
          },
        },
      },
    });
  }

  const argv = [
    '--branch',
    '6.0',
    '--branch',
    '6.1',
    '--upstream',
    'elastic/kibana',
  ] as const;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should check whether the acccess token is valid', async () => {
    jest.spyOn(axios, 'post').mockRejectedValueOnce({
      response: { status: 401, data: { errors: [] } },
    });
    await expect(getOptions(argv)).rejects.toThrowError(
      'Please check your access token and make sure it is valid.\nConfig: /myHomeDir/.backport/config.json'
    );
  });

  it('should get default repository branch', async () => {
    const spy = getPerformStartChecksSpy({
      defaultBranch: 'my-default-branch',
    });
    const options = await getOptions(argv);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(options.sourceBranch).toBe('my-default-branch');
  });

  it('should ensure that "backport" branch does not exist', async () => {
    getPerformStartChecksSpy({
      defaultBranch: 'my-default-branch',
      refName: 'backport',
    });

    await expect(getOptions(argv)).rejects.toThrowError(
      'You must delete the branch "backport" to continue. See https://github.com/sqren/backport/issues/155 for details'
    );
  });

  it('should return options', async () => {
    getPerformStartChecksSpy({ defaultBranch: 'some-branch-name' });
    const options = await getOptions(argv);

    expect(options).toEqual({
      accessToken: 'myAccessToken',
      all: false,
      githubApiBaseUrlV3: 'https://api.github.com',
      githubApiBaseUrlV4: 'https://api.github.com/graphql',
      author: 'sqren',
      backportCreatedLabels: [],
      targetBranchChoices: [
        { checked: false, name: '6.0' },
        { checked: false, name: '5.9' },
      ],
      targetBranches: ['6.0', '6.1'],
      fork: true,
      gitHostname: 'github.com',
      labels: [],
      multiple: false,
      multipleBranches: true,
      multipleCommits: false,
      prTitle: '[{targetBranch}] {commitMessages}',
      repoName: 'kibana',
      repoOwner: 'elastic',
      resetAuthor: false,
      sourceBranch: 'some-branch-name',
      username: 'sqren',
      verbose: false,
    });
  });
});

describe('validateRequiredOptions', () => {
  const validOptions: OptionsFromCliArgs = {
    accessToken: 'myAccessToken',
    all: false,
    branchLabelMapping: undefined,
    githubApiBaseUrlV3: 'https://api.github.com',
    githubApiBaseUrlV4: 'https://api.github.com/graphql',
    author: undefined,
    backportCreatedLabels: [],
    targetBranchChoices: [],
    targetBranches: ['branchA'],
    commitsCount: 10,
    editor: 'code',
    fork: true,
    gitHostname: 'github.com',
    labels: [],
    mainline: undefined,
    multiple: false,
    multipleBranches: true,
    multipleCommits: false,
    path: undefined,
    prDescription: undefined,
    prTitle: 'myPrTitle',
    pullNumber: undefined,
    resetAuthor: false,
    sha: undefined,
    sourceBranch: 'mySourceBranch',
    upstream: 'elastic/kibana',
    username: 'sqren',
    verbose: false,
  };

  describe('should not throw', () => {
    it('when all options are valid and `branches` is given', () => {
      expect(() => validateRequiredOptions(validOptions)).not.toThrow();
    });

    it('when all options are valid and `targetBranchChoices` is given', () => {
      expect(() =>
        validateRequiredOptions({
          ...validOptions,
          targetBranchChoices: [{ name: 'branchA' }],
          targetBranches: [],
        })
      ).not.toThrow();
    });
  });

  describe('should throw', () => {
    it('when accessToken is missing', () => {
      expect(() =>
        validateRequiredOptions({
          ...validOptions,
          accessToken: undefined,
        })
      ).toThrowErrorMatchingSnapshot();
    });

    it('when accessToken is empty', () => {
      expect(() =>
        validateRequiredOptions({
          ...validOptions,
          accessToken: '',
        })
      ).toThrowErrorMatchingSnapshot();
    });

    it('when both branches and targetBranchChoices are missing', () => {
      expect(() =>
        validateRequiredOptions({
          ...validOptions,
          targetBranchChoices: [],
          targetBranches: [],
        })
      ).toThrowErrorMatchingSnapshot();
    });

    it('when upstream is missing', () => {
      expect(() =>
        validateRequiredOptions({
          ...validOptions,
          upstream: undefined,
        })
      ).toThrowErrorMatchingSnapshot();
    });

    it('when upstream is empty', () => {
      expect(() =>
        validateRequiredOptions({
          ...validOptions,
          upstream: '',
        })
      ).toThrowErrorMatchingSnapshot();
    });

    it('when username is missing', () => {
      expect(() =>
        validateRequiredOptions({
          ...validOptions,
          username: undefined,
        })
      ).toThrowErrorMatchingSnapshot();
    });

    it('when username is empty', () => {
      expect(() =>
        validateRequiredOptions({
          ...validOptions,
          username: '',
        })
      ).toThrowErrorMatchingSnapshot();
    });
  });
});
