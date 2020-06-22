import { OptionsFromCliArgs } from './cliArgs';
import { getValidatedOptions } from './getValidatedOptions';

describe('getValidatedOptions', () => {
  const validOptions: OptionsFromCliArgs = {
    accessToken: 'myAccessToken',
    all: false,
    assignees: [],
    author: undefined,
    autoFixConflicts: undefined,
    branchLabelMapping: undefined,
    dryRun: false,
    editor: 'code',
    fork: true,
    gitHostname: 'github.com',
    githubApiBaseUrlV3: 'https://api.github.com',
    githubApiBaseUrlV4: 'https://api.github.com/graphql',
    mainline: undefined,
    maxNumber: 10,
    multipleBranches: true,
    multipleCommits: false,
    noVerify: true,
    path: undefined,
    prDescription: undefined,
    prTitle: 'myPrTitle',
    pullNumber: undefined,
    resetAuthor: false,
    sha: undefined,
    sourceBranch: 'mySourceBranch',
    sourcePRLabels: [],
    prFilter: undefined,
    targetBranchChoices: [],
    targetBranches: ['branchA'],
    targetPRLabels: [],
    upstream: 'elastic/kibana',
    username: 'sqren',
    verbose: false,
  };

  describe('should not throw', () => {
    it('when all options are valid and `branches` is given', () => {
      expect(() => getValidatedOptions(validOptions)).not.toThrow();
    });

    it('when `targetBranchChoices` is given instead of `targetBranches`', () => {
      expect(() =>
        getValidatedOptions({
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
        getValidatedOptions({
          ...validOptions,
          accessToken: undefined,
        })
      ).toThrowErrorMatchingSnapshot();
    });

    it('when accessToken is empty', () => {
      expect(() =>
        getValidatedOptions({
          ...validOptions,
          accessToken: '',
        })
      ).toThrowErrorMatchingSnapshot();
    });

    it('when both `targetBranches` and `targetBranchChoices` are missing', () => {
      expect(() =>
        getValidatedOptions({
          ...validOptions,
          targetBranchChoices: [],
          targetBranches: [],
        })
      ).toThrowErrorMatchingSnapshot();
    });

    it('when upstream is missing', () => {
      expect(() =>
        getValidatedOptions({
          ...validOptions,
          upstream: undefined,
        })
      ).toThrowErrorMatchingSnapshot();
    });

    it('when upstream is empty', () => {
      expect(() =>
        getValidatedOptions({
          ...validOptions,
          upstream: '',
        })
      ).toThrowErrorMatchingSnapshot();
    });

    it('when username is missing', () => {
      expect(() =>
        getValidatedOptions({
          ...validOptions,
          username: undefined,
        })
      ).toThrowErrorMatchingSnapshot();
    });

    it('when username is empty', () => {
      expect(() =>
        getValidatedOptions({
          ...validOptions,
          username: '',
        })
      ).toThrowErrorMatchingSnapshot();
    });
  });
});
