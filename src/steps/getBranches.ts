import { BackportOptions } from '../options/options';
import { promptForBranches } from '../services/prompts';
import isEmpty from 'lodash.isempty';
import { BranchChoice } from '../types/Config';

export function getBranches(options: BackportOptions) {
  if (!isEmpty(options.branches)) {
    return options.branches;
  }

  return promptForBranches(
    options.branchChoices as BranchChoice[],
    options.multipleBranches
  );
}
