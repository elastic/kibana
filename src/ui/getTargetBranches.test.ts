import { BranchChoice } from '../options/ConfigOptions';
import { ValidConfigOptions } from '../options/options';
import * as prompts from '../services/prompts';
import { Commit } from '../types/Commit';
import { SpyHelper } from '../types/SpyHelper';
import { getTargetBranches, getTargetBranchChoices } from './getTargetBranches';

describe('getTargetBranches', () => {
  let promptSpy: SpyHelper<typeof prompts.promptForTargetBranches>;

  beforeEach(() => {
    jest.clearAllMocks();

    promptSpy = jest
      .spyOn(prompts, 'promptForTargetBranches')
      .mockResolvedValueOnce(['branchA']);
  });

  describe('when `targetBranchesFromLabels=["7.x"]`', () => {
    let targetBranchChoices: BranchChoice[];
    beforeEach(async () => {
      const options = ({
        targetBranches: [],
        multipleBranches: true,
        targetBranchChoices: [
          { name: 'master' },
          { name: '7.x' },
          { name: '7.7' },
          { name: '7.6' },
          { name: '7.5' },
        ] as BranchChoice[],
        branchLabelMapping: {},
        sourceBranch: 'master',
      } as unknown) as ValidConfigOptions;

      const commits = [
        {
          sourceBranch: 'master',
          targetBranchesFromLabels: ['7.x'],
          sha: 'my-sha',
          formattedMessage: '[backport] Bump to 5.1.3 (#62286)',
          originalMessage: '[backport] Bump to 5.1.3 (#62286)',
          pullNumber: 62286,
          existingTargetPullRequests: [],
        },
      ];

      await getTargetBranches(options, commits);
      targetBranchChoices = promptSpy.mock.calls[0][0].targetBranchChoices;
    });

    it('should list the correct branches', async () => {
      expect(targetBranchChoices).toEqual([
        { checked: true, name: '7.x' },
        { checked: false, name: '7.7' },
        { checked: false, name: '7.6' },
        { checked: false, name: '7.5' },
      ]);
    });

    it('should not list the sourceBranch (master)', async () => {
      expect(targetBranchChoices).not.toContainEqual(
        expect.objectContaining({ name: 'master' })
      );
    });

    it('should select 7.x', async () => {
      expect(targetBranchChoices).toContainEqual({
        name: '7.x',
        checked: true,
      });
    });
  });

  describe('when `targetBranchesFromLabels=["8.0.0"]`', () => {
    let targetBranchChoices: BranchChoice[];
    beforeEach(async () => {
      const options = ({
        targetBranches: [],
        multipleBranches: true,
        targetBranchChoices: [
          { name: '7.x' },
          { name: '7.7' },
          { name: '7.6' },
          { name: '7.5' },
        ] as BranchChoice[],
        sourceBranch: 'master',
      } as unknown) as ValidConfigOptions;

      const commits = [
        {
          sourceBranch: 'master',
          targetBranchesFromLabels: ['8.0.0'],
          sha: 'my-sha',
          formattedMessage: '[backport] Bump to 5.1.3 (#62286)',
          originalMessage: '[backport] Bump to 5.1.3 (#62286)',
          pullNumber: 62286,
          existingTargetPullRequests: [],
        },
      ];

      await getTargetBranches(options, commits);
      targetBranchChoices = promptSpy.mock.calls[0][0].targetBranchChoices;
    });

    it('should list the correct branches', async () => {
      expect(targetBranchChoices).toEqual([
        { name: '7.x' },
        { name: '7.7' },
        { name: '7.6' },
        { name: '7.5' },
      ]);
    });
  });

  describe('when `options.targetBranches` is empty', () => {
    let branches: ReturnType<typeof getTargetBranches>;

    beforeEach(async () => {
      const options = ({
        targetBranches: [],
        targetBranchChoices: [{ name: 'branchA' }, { name: 'branchB' }],
        multipleBranches: false,
      } as unknown) as ValidConfigOptions;

      const commits: Commit[] = [
        {
          formattedMessage: 'hey',
          originalMessage: 'hey',
          targetBranchesFromLabels: [],
          sha: 'abcd',
          sourceBranch: '7.x',
          pullNumber: 1337,
          existingTargetPullRequests: [],
        },
      ];

      branches = await getTargetBranches(options, commits);
    });

    it('should return branches from prompt', () => {
      expect(branches).toEqual(['branchA']);
    });

    it('should call prompt with correct args', () => {
      expect(promptSpy).toHaveBeenLastCalledWith({
        targetBranchChoices: [{ name: 'branchA' }, { name: 'branchB' }],
        isMultipleChoice: false,
      });
    });
  });

  describe('when `options.targetBranches` is not empty', () => {
    let branches: ReturnType<typeof getTargetBranches>;

    beforeEach(() => {
      branches = getTargetBranches(
        ({
          targetBranches: ['branchA', 'branchB'],
          targetBranchChoices: [],
          multipleBranches: false,
        } as unknown) as ValidConfigOptions,
        []
      );
    });

    it('should return branches from `options.branches`', () => {
      expect(branches).toEqual(['branchA', 'branchB']);
    });

    it('should not call prompt', () => {
      expect(promptSpy).not.toHaveBeenCalled();
    });
  });
});

describe('getTargetBranchChoices', () => {
  const options = ({
    ci: false,
    targetBranchChoices: [
      { name: 'master', checked: true },
      { name: '7.x', checked: true },
      { name: '7.8', checked: false },
      { name: '7.7', checked: false },
    ],
    branchLabelMapping: {},
  } as unknown) as ValidConfigOptions;

  const sourceBranch = 'master';

  it('should not check any branches if no labels match', () => {
    const targetBranchesFromLabels = [] as string[];
    const branches = getTargetBranchChoices(
      options,
      targetBranchesFromLabels,
      sourceBranch
    );

    expect(branches).toEqual([
      { checked: false, name: '7.x' },
      { checked: false, name: '7.8' },
      { checked: false, name: '7.7' },
    ]);
  });

  it('should not return default branches when running in "--ci" mode', () => {
    const targetBranchesFromLabels = [] as string[];
    const branches = getTargetBranchChoices(
      { ...options, ci: true },
      targetBranchesFromLabels,
      sourceBranch
    );

    expect(branches).toEqual([
      { checked: false, name: '7.x' },
      { checked: false, name: '7.8' },
      { checked: false, name: '7.7' },
    ]);
  });

  it('should pre-select branches based on labels', () => {
    const targetBranchesFromLabels = ['7.7'];

    const branches = getTargetBranchChoices(
      options,
      targetBranchesFromLabels,
      sourceBranch
    );

    expect(branches).toEqual([
      { checked: false, name: '7.x' },
      { checked: false, name: '7.8' },
      { checked: true, name: '7.7' },
    ]);
  });
});
