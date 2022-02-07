import { isEmpty, isString } from 'lodash';
import {
  TargetBranchChoice,
  TargetBranchChoiceOrString,
} from '../options/ConfigOptions';
import { ValidConfigOptions } from '../options/options';
import { HandledError } from '../services/HandledError';
import { promptForTargetBranches } from '../services/prompts';
import { Commit } from '../services/sourceCommit/parseSourceCommit';

export function getTargetBranches(
  options: ValidConfigOptions,
  commits: Commit[]
) {
  // target branches already specified (in contrast to letting the user choose from a list)
  if (!isEmpty(options.targetBranches)) {
    return options.targetBranches;
  }

  // target branches from the first commit
  const missingTargetBranches =
    commits.length === 1
      ? commits[0].expectedTargetPullRequests
          .filter((pr) => pr.state === 'MISSING')
          .map((pr) => pr.branch)
      : [];

  // automatically backport to specified target branches
  if (options.ci) {
    if (isEmpty(missingTargetBranches)) {
      throw new HandledError({ code: 'no-branches-exception' });
    }

    return missingTargetBranches;
  }

  // sourceBranch should be the same for all commits, so picking `sourceBranch` from the first commit should be fine 🤞
  // this is specifically needed when backporting a PR like `backport --pr 123` and the source PR was merged to a non-default (aka non-master) branch.
  const { sourceBranch } = commits[0];

  const targetBranchChoices = getTargetBranchChoices(
    options,
    missingTargetBranches,
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
  missingTargetBranches: string[],
  sourceBranch: string
) {
  // exclude sourceBranch from targetBranchChoices
  const targetBranchesChoices = getTargetBranchChoicesAsObject(
    options.targetBranchChoices
  ).filter((choice) => choice.name !== sourceBranch);

  if (isEmpty(targetBranchesChoices)) {
    throw new HandledError('Missing target branch choices');
  }

  if (!options.branchLabelMapping) {
    return targetBranchesChoices;
  }

  // select missing target branches (based on pull request labels)
  return targetBranchesChoices.map((choice) => {
    const isChecked = missingTargetBranches.includes(choice.name);
    return { ...choice, checked: isChecked };
  });
}

// `targetBranchChoices` can either be a string or an object.
// It must be transformed so it is always treated as an object troughout the application
function getTargetBranchChoicesAsObject(
  targetBranchChoices?: TargetBranchChoiceOrString[]
): TargetBranchChoice[] {
  if (!targetBranchChoices) {
    return [];
  }

  return targetBranchChoices.map((choice) => {
    if (isString(choice)) {
      return {
        name: choice,
        checked: false,
      };
    }

    return choice;
  });
}
