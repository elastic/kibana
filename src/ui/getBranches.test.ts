import * as prompts from '../services/prompts';
import { getBranches } from './getBranches';

describe('getBranches', () => {
  let promptSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    jest.clearAllMocks();

    promptSpy = jest
      .spyOn(prompts, 'promptForBranches')
      .mockResolvedValueOnce(['branchA']);
  });

  describe('when `options.branches` is empty', () => {
    let branches: ReturnType<typeof getBranches>;

    beforeEach(async () => {
      branches = await getBranches({
        branches: [],
        branchChoices: ['branchA', 'branchB'],
        multipleBranches: false,
      } as any);
    });

    it('should return branches from prompt', () => {
      expect(branches).toEqual(['branchA']);
    });

    it('should call prompt with correct args', () => {
      expect(promptSpy).toHaveBeenLastCalledWith(['branchA', 'branchB'], false);
    });
  });

  describe('when `options.branches` is not empty', () => {
    let branches: ReturnType<typeof getBranches>;

    beforeEach(() => {
      branches = getBranches({
        branches: ['branchA', 'branchB'],
        branchChoices: [],
        multipleBranches: false,
      } as any);
    });

    it('should return branches from `options.branches`', () => {
      expect(branches).toEqual(['branchA', 'branchB']);
    });

    it('should not call prompt', () => {
      expect(promptSpy).not.toHaveBeenCalled();
    });
  });
});
