import { OptionsFromCliArgs } from './cliArgs';
import { validateRequiredOptions } from './options';

const validOptions: OptionsFromCliArgs = {
  accessToken: 'myAccessToken',
  all: false,
  apiHostname: 'api.github.com',
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
  upstream: 'elastic/kibana',
  username: 'sqren',
  verbose: false
};

describe('validateRequiredOptions', () => {
  describe('should not throw', () => {
    it('when all options are valid and `branches` is given', () => {
      expect(() => validateRequiredOptions(validOptions)).not.toThrow();
    });

    it('when all options are valid and `branchChoices` is given', () => {
      expect(() =>
        validateRequiredOptions({
          ...validOptions,
          branchChoices: [{ name: 'branchA' }],
          branches: []
        })
      ).not.toThrow();
    });
  });

  describe('should throw', () => {
    it('when accessToken is missing', () => {
      expect(() =>
        validateRequiredOptions({
          ...validOptions,
          accessToken: undefined
        })
      ).toThrowErrorMatchingSnapshot();
    });

    it('when accessToken is empty', () => {
      expect(() =>
        validateRequiredOptions({
          ...validOptions,
          accessToken: ''
        })
      ).toThrowErrorMatchingSnapshot();
    });

    it('when both branches and branchChoices are missing', () => {
      expect(() =>
        validateRequiredOptions({
          ...validOptions,
          branchChoices: [],
          branches: []
        })
      ).toThrowErrorMatchingSnapshot();
    });

    it('when upstream is missing', () => {
      expect(() =>
        validateRequiredOptions({
          ...validOptions,
          upstream: undefined
        })
      ).toThrowErrorMatchingSnapshot();
    });

    it('when upstream is empty', () => {
      expect(() =>
        validateRequiredOptions({
          ...validOptions,
          upstream: ''
        })
      ).toThrowErrorMatchingSnapshot();
    });

    it('when username is missing', () => {
      expect(() =>
        validateRequiredOptions({
          ...validOptions,
          username: undefined
        })
      ).toThrowErrorMatchingSnapshot();
    });

    it('when username is empty', () => {
      expect(() =>
        validateRequiredOptions({
          ...validOptions,
          username: ''
        })
      ).toThrowErrorMatchingSnapshot();
    });
  });
});
