import { BackportOptions } from '../options/options';
import * as prompts from '../services/prompts';
import { SpyHelper } from './../types/SpyHelper';
import { getTargetBranches } from './getBranches';

describe('getTargetBranches', () => {
  let promptSpy: SpyHelper<typeof prompts.promptForTargetBranches>;

  beforeEach(() => {
    jest.clearAllMocks();

    promptSpy = jest
      .spyOn(prompts, 'promptForTargetBranches')
      .mockResolvedValueOnce(['branchA']);
  });

  describe('when `options.targetBranches` is empty', () => {
    let branches: ReturnType<typeof getTargetBranches>;

    beforeEach(async () => {
      branches = await getTargetBranches(
        ({
          targetBranches: [],
          targetBranchChoices: [{ name: 'branchA' }, { name: 'branchB' }],
          multipleBranches: false,
        } as unknown) as BackportOptions,
        []
      );
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
        } as unknown) as BackportOptions,
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
