import { OptionsFromGithub } from '../services/github/v4/getOptionsFromGithub';
import { OptionsFromCliArgs } from './cliArgs';
import { defaultConfigOptions, OptionsFromConfigFiles } from './config/config';
import { parseRequiredOptions } from './parseRequiredOptions';

describe('parseRequiredOptions', () => {
  const optionsFromConfigFiles = {
    ...defaultConfigOptions,
    accessToken: 'myAccessToken',
    username: 'sqren',
    upstream: 'elastic/kibana',
    targetBranches: ['branchA', 'branchB'],
  } as OptionsFromConfigFiles;

  const optionsFromCliArgs = {} as OptionsFromCliArgs;
  const optionsFromGithub = { sourceBranch: 'main' } as OptionsFromGithub;

  describe('should not throw', () => {
    it('when all options are valid and `branches` is given', () => {
      expect(() =>
        parseRequiredOptions(
          optionsFromConfigFiles,
          optionsFromCliArgs,
          optionsFromGithub
        )
      ).not.toThrow();
    });

    it('when `targetBranchChoices` is given instead of `targetBranches`', () => {
      expect(() =>
        parseRequiredOptions(
          {
            ...optionsFromConfigFiles,
            targetBranchChoices: [{ name: 'branchA' }],
            targetBranches: [],
          },
          optionsFromCliArgs,
          optionsFromGithub
        )
      ).not.toThrow();
    });

    describe('autoAssign/assignees', () => {
      it('should set `assignees` to current user if `autoAssign` is true', () => {
        const options = parseRequiredOptions(
          { ...optionsFromConfigFiles, assignees: ['john'] },
          { autoAssign: true } as OptionsFromCliArgs,
          optionsFromGithub
        );
        expect(options.assignees).toEqual(['sqren']);
      });

      it('should set `assignees` to specified value if `autoAssign` is false', () => {
        const options = parseRequiredOptions(
          { ...optionsFromConfigFiles, assignees: ['john'] },
          { autoAssign: false } as OptionsFromCliArgs,
          optionsFromGithub
        );
        expect(options.assignees).toEqual(['john']);
      });

      it('should set `assignees` to empty if neither `assignees` or `autoAssign` is specified', () => {
        const options = parseRequiredOptions(
          { ...optionsFromConfigFiles, assignees: [] },
          { autoAssign: false } as OptionsFromCliArgs,
          optionsFromGithub
        );
        expect(options.assignees).toEqual([]);
      });
    });

    describe('targetBranchChoices', () => {
      it('should convert primitives', () => {
        const options = parseRequiredOptions(
          {
            ...optionsFromConfigFiles,
            targetBranchChoices: ['choice 1', 'choice 2'],
          },
          optionsFromCliArgs,
          optionsFromGithub
        );
        expect(options.targetBranchChoices).toEqual([
          { name: 'choice 1', checked: false },
          { name: 'choice 2', checked: false },
        ]);
      });

      it('should preserve objects as-is', () => {
        const options = parseRequiredOptions(
          {
            ...optionsFromConfigFiles,
            targetBranchChoices: [
              { name: 'choice 1', checked: false },
              { name: 'choice 2', checked: true },
            ],
          },
          optionsFromCliArgs,
          optionsFromGithub
        );
        expect(options.targetBranchChoices).toEqual([
          { name: 'choice 1', checked: false },
          { name: 'choice 2', checked: true },
        ]);
      });
    });
  });

  describe('should throw', () => {
    it('when accessToken is missing', () => {
      expect(() =>
        parseRequiredOptions(
          {
            ...optionsFromConfigFiles,
            accessToken: undefined,
          },
          optionsFromCliArgs,
          optionsFromGithub
        )
      ).toThrowErrorMatchingSnapshot();
    });

    it('when accessToken is empty', () => {
      expect(() =>
        parseRequiredOptions(
          {
            ...optionsFromConfigFiles,
            accessToken: '',
          },
          optionsFromCliArgs,
          optionsFromGithub
        )
      ).toThrowErrorMatchingSnapshot();
    });

    it('when `targetBranches`, `targetBranchChoices` and `branchLabelMapping` are all empty', () => {
      expect(() =>
        parseRequiredOptions(
          {
            ...optionsFromConfigFiles,
            targetBranchChoices: [],
            targetBranches: [],
            branchLabelMapping: {},
          },
          optionsFromCliArgs,
          optionsFromGithub
        )
      ).toThrowErrorMatchingSnapshot();
    });

    it('when upstream is missing', () => {
      expect(() =>
        parseRequiredOptions(
          {
            ...optionsFromConfigFiles,
            upstream: undefined,
          },
          optionsFromCliArgs,
          optionsFromGithub
        )
      ).toThrowErrorMatchingSnapshot();
    });

    it('when upstream is empty', () => {
      expect(() =>
        parseRequiredOptions(
          {
            ...optionsFromConfigFiles,
            upstream: '',
          },
          optionsFromCliArgs,
          optionsFromGithub
        )
      ).toThrowErrorMatchingSnapshot();
    });

    it('when upstream is invalid', () => {
      expect(() =>
        parseRequiredOptions(
          {
            ...optionsFromConfigFiles,
            upstream: 'foobar',
          },
          optionsFromCliArgs,
          optionsFromGithub
        )
      ).toThrowErrorMatchingSnapshot();
    });

    it('when username is missing', () => {
      expect(() =>
        parseRequiredOptions(
          {
            ...optionsFromConfigFiles,
            username: undefined,
          },
          optionsFromCliArgs,
          optionsFromGithub
        )
      ).toThrowErrorMatchingSnapshot();
    });

    it('when username is empty', () => {
      expect(() =>
        parseRequiredOptions(
          {
            ...optionsFromConfigFiles,
            username: '',
          },
          optionsFromCliArgs,
          optionsFromGithub
        )
      ).toThrowErrorMatchingSnapshot();
    });
  });
});
