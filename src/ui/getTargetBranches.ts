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
  // target branches already specified (in contrast to letting the user choose from a list)
  if (!isEmpty(options.targetBranches)) {
    return options.targetBranches;
  }

  // combine target branches from commits that were selected for backporting
  const selectedTargetBranches = flatMap(
    commits,
    (commit) => commit.selectedTargetBranches
  ).filter(filterEmpty);

  // sourceBranch should be the same for all commits, so picking `sourceBranch` from the first commit should be fine 🤞
  // this is specifically needed when backporting a PR like `backport --pr 123` and the source PR is merged to a non-default (aka non-master) branch.
  const { sourceBranch } = commits[0];

  // list the target branch choices (in contrast to automatically backporting to specific branches)
  return promptForTargetBranches({
    targetBranchChoices: getTargetBranchChoices(
      options,
      selectedTargetBranches,
      sourceBranch
    ),
    isMultipleChoice: options.multipleBranches,
  });
}

function getTargetBranchChoices(
  options: BackportOptions,
  selectedTargetBranches: string[],
  sourceBranch: string
) {
  // exclude sourceBranch from targetBranchChoices
  const targetBranchChoices = options.targetBranchChoices?.filter(
    (choice) => choice.name !== sourceBranch
  );

  if (!targetBranchChoices || isEmpty(targetBranchChoices)) {
    throw new HandledError('Missing target branch choices');
  }

  // whether the selected target branches exists
  const hasSelectedTargetBranches = targetBranchChoices.some((c) =>
    selectedTargetBranches.includes(c.name)
  );

  // use default target branch selection
  if (!hasSelectedTargetBranches) {
    return targetBranchChoices;
  }

  // automatially select target branches based on pull request labels
  return targetBranchChoices.map((choice) => {
    const isChecked = selectedTargetBranches.includes(choice.name);
    return {
      ...choice,
      checked: isChecked,
    };
  });
}
