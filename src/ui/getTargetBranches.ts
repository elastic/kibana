import { isEmpty, intersection } from 'lodash';
import { ValidConfigOptions } from '../options/options';
import { HandledError } from '../services/HandledError';
import { promptForTargetBranches } from '../services/prompts';
import { Commit } from '../services/sourceCommit';
import { filterNil } from '../utils/filterEmpty';

export function getTargetBranches(
  options: ValidConfigOptions,
  commits: Commit[]
) {
  // target branches already specified (in contrast to letting the user choose from a list)
  if (!isEmpty(options.targetBranches)) {
    return options.targetBranches;
  }

  // intersection of target branches from the selected commits
  const expectedTargetBranchesFromLabels = intersection(
    ...commits.map((commit) => commit.targetBranchesFromLabels.expected)
  ).filter(filterNil);

  // automatically backport to specified target branches
  if (options.ci) {
    if (isEmpty(expectedTargetBranchesFromLabels)) {
      throw new HandledError(`There are no branches to backport to. Aborting.`);
    }

    return expectedTargetBranchesFromLabels;
  }

  // sourceBranch should be the same for all commits, so picking `sourceBranch` from the first commit should be fine 🤞
  // this is specifically needed when backporting a PR like `backport --pr 123` and the source PR was merged to a non-default (aka non-master) branch.
  const { sourceBranch } = commits[0];

  const targetBranchChoices = getTargetBranchChoices(
    options,
    expectedTargetBranchesFromLabels,
    sourceBranch
  );

  // render interactive list of branches
  return promptForTargetBranches({
    targetBranchChoices,
    isMultipleChoice: options.multipleBranches,
  });
}

export function getTargetBranchChoices(
  options: ValidConfigOptions,
  expectedTargetBranchesFromLabels: string[],
  sourceBranch: string
) {
  // exclude sourceBranch from targetBranchChoices
  const targetBranchesChoices = options.targetBranchChoices.filter(
    (choice) => choice.name !== sourceBranch
  );

  if (isEmpty(targetBranchesChoices)) {
    throw new HandledError('Missing target branch choices');
  }

  if (!options.branchLabelMapping) {
    return targetBranchesChoices;
  }

  // select target branches based on pull request labels
  return targetBranchesChoices.map((choice) => {
    const isChecked = expectedTargetBranchesFromLabels.includes(choice.name);
    return { ...choice, checked: isChecked };
  });
}
