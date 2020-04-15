import flatMap from 'lodash.flatmap';
import isEmpty from 'lodash.isempty';
import { BackportOptions } from '../options/options';
import { HandledError } from '../services/HandledError';
import { promptForTargetBranches } from '../services/prompts';
import { CommitSelected } from '../types/Commit';
import { filterEmpty } from '../utils/filterEmpty';

export function getTargetBranches(
  options: BackportOptions,
  commits: CommitSelected[]
) {
  // target branches specified via cli
  if (!isEmpty(options.targetBranches)) {
    return options.targetBranches;
  }

  // combine target branches from all commits
  const targetBranchesFromLabels = flatMap(
    commits,
    (commit) => commit.targetBranches
  ).filter(filterEmpty);

  return promptForTargetBranches({
    targetBranchChoices: getTargetBranchChoices(
      options,
      targetBranchesFromLabels
    ),
    isMultipleChoice: options.multipleBranches,
  });
}

function getTargetBranchChoices(
  options: BackportOptions,
  targetBranchesFromLabels: string[]
) {
  if (!options.targetBranchChoices) {
    throw new HandledError('Missing target branch choices');
  }

  // no labels were found
  if (isEmpty(targetBranchesFromLabels)) {
    return options.targetBranchChoices;
  }

  // automatially check options based on pull request labels
  return options.targetBranchChoices.map((choice) => {
    const isChecked = targetBranchesFromLabels.includes(choice.name);
    return {
      ...choice,
      checked: isChecked,
    };
  });
}
