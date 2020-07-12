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
  const targetBranchesFromLabels = flatMap(
    commits,
    (commit) => commit.targetBranchesFromLabels
  ).filter(filterEmpty);

  // sourceBranch should be the same for all commits, so picking `sourceBranch` from the first commit should be fine 🤞
  // this is specifically needed when backporting a PR like `backport --pr 123` and the source PR was merged to a non-default (aka non-master) branch.
  const { sourceBranch } = commits[0];

  const targetBranchChoices = getTargetBranchChoices(
    options,
    targetBranchesFromLabels,
    sourceBranch
  );

  // automatically select the pre-checked branches
  if (options.ci) {
    const branches = targetBranchChoices
      .filter((branch) => branch.checked)
      .map((branch) => branch.name);

    if (isEmpty(branches)) {
      throw new HandledError(
        `There are no branches to backport to. Aborting.
Branches: ${JSON.stringify(options.targetBranchChoices.map((b) => b.name))}
Labels: ${JSON.stringify(targetBranchesFromLabels)}`
      );
    }

    return branches;
  }

  // render interactive list of branches
  return promptForTargetBranches({
    targetBranchChoices,
    isMultipleChoice: options.multipleBranches,
  });
}

function getTargetBranchChoices(
  options: BackportOptions,
  targetBranchesFromLabels: string[],
  sourceBranch: string
) {
  // exclude sourceBranch from targetBranchChoices
  const targetBranchesFromOptions = options.targetBranchChoices.filter(
    (choice) => choice.name !== sourceBranch
  );

  if (isEmpty(targetBranchesFromOptions)) {
    throw new HandledError('Missing target branch choices');
  }

  // automatially select target branches based on pull request labels
  const preSelectedBranches = targetBranchesFromOptions.map((choice) => {
    const isChecked = targetBranchesFromLabels.includes(choice.name);
    return { ...choice, checked: isChecked };
  });

  // if none of the choices are pre-selected (via PR labels) use the default selection (given via config options)
  const hasAnySelections = preSelectedBranches.some((branch) => branch.checked);
  if (!hasAnySelections) {
    return targetBranchesFromOptions;
  }

  return preSelectedBranches;
}
