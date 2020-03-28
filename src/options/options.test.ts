import { OptionsFromCliArgs } from './cliArgs';
import {
  validateRequiredOptions,
  getOptions,
  BackportOptions,
} from './options';
import axios from 'axios';

describe('getOptions', () => {
  let axiosHeadSpy: jest.SpyInstance;
  let axiosPostSpy: jest.SpyInstance;
  let options: BackportOptions;

  beforeEach(async () => {
    jest.clearAllMocks();
    axiosHeadSpy = jest.spyOn(axios, 'head').mockReturnValueOnce(true as any);
    axiosPostSpy = jest.spyOn(axios, 'post').mockReturnValueOnce({
      data: {
        data: { repository: { defaultBranchRef: { name: 'myDefaultBranch' } } },
      },
    } as any);

    const argv = [
      '--branch',
      '6.0',
      '--branch',
      '6.1',
      '--upstream',
      'elastic/kibana',
    ];

    options = await getOptions(argv);
  });

  it('should check whether access token is valid', () => {
    expect(axiosHeadSpy).toHaveBeenCalledTimes(1);
    expect(axiosHeadSpy).toHaveBeenCalledWith(
      'https://api.github.com/repos/elastic/kibana',
      {
        auth: { password: 'myAccessToken', username: 'sqren' },
      }
    );
  });

  it('should get default repositry branch', () => {
    expect(axiosPostSpy).toHaveBeenCalledTimes(1);
  });

  it('should return options', async () => {
    expect(options).toEqual({
      accessToken: 'myAccessToken',
      all: false,
      githubApiBaseUrlV3: 'https://api.github.com',
      githubApiBaseUrlV4: 'https://api.github.com/graphql',
      author: 'sqren',
      backportCreatedLabels: [],
      branchChoices: [
        { checked: false, name: '6.0' },
        { checked: false, name: '5.9' },
      ],
      branches: ['6.0', '6.1'],
      fork: true,
      gitHostname: 'github.com',
      labels: [],
      multiple: false,
      multipleBranches: true,
      multipleCommits: false,
      prTitle: '[{baseBranch}] {commitMessages}',
      repoName: 'kibana',
      repoOwner: 'elastic',
      resetAuthor: false,
      sourceBranch: 'myDefaultBranch',
      username: 'sqren',
      verbose: false,
    });
  });
});

describe('validateRequiredOptions', () => {
  const validOptions: OptionsFromCliArgs = {
    accessToken: 'myAccessToken',
    all: false,
    githubApiBaseUrlV3: 'https://api.github.com',
    githubApiBaseUrlV4: 'https://api.github.com/graphql',
    author: undefined,
    backportCreatedLabels: [],
    branchChoices: [],
    branches: ['branchA'],
    commitsCount: 10,
    editor: 'code',
    fork: true,
    gitHostname: 'github.com',
    labels: [],
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

    it('when all options are valid and `branchChoices` is given', () => {
      expect(() =>
        validateRequiredOptions({
          ...validOptions,
          branchChoices: [{ name: 'branchA' }],
          branches: [],
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

    it('when both branches and branchChoices are missing', () => {
      expect(() =>
        validateRequiredOptions({
          ...validOptions,
          branchChoices: [],
          branches: [],
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
