import uniq from 'lodash.uniq';
import { ValidConfigOptions } from '../../../options/options';
import { filterNil } from '../../../utils/filterEmpty';
import { logger } from '../../logger';
import { ExistingTargetPullRequests } from './getExistingTargetPullRequests';

export function getTargetBranchForLabel({
  branchLabelMapping,
  label,
}: {
  branchLabelMapping: NonNullable<ValidConfigOptions['branchLabelMapping']>;
  label: string;
}) {
  // only get first match
  const result = Object.entries(branchLabelMapping).find(([labelPattern]) => {
    const regex = new RegExp(labelPattern);
    const isMatch = label.match(regex) !== null;
    return isMatch;
  });

  if (result) {
    const [labelPattern, targetBranchPattern] = result;
    const regex = new RegExp(labelPattern);
    const targetBranch = label.replace(regex, targetBranchPattern);
    if (targetBranch) {
      return targetBranch;
    }
  }
}

export function getTargetBranchesFromLabels({
  sourceBranch,
  existingTargetPullRequests,
  branchLabelMapping,
  labels,
}: {
  sourceBranch: string;
  existingTargetPullRequests: ExistingTargetPullRequests;
  branchLabelMapping: ValidConfigOptions['branchLabelMapping'];
  labels?: string[];
}) {
  if (!branchLabelMapping || !labels) {
    return [];
  }

  const existingBranches = existingTargetPullRequests.map((pr) => pr.branch);

  const targetBranches = labels
    .map((label) => getTargetBranchForLabel({ branchLabelMapping, label }))
    .filter(filterNil)
    .filter((targetBranch) => !existingBranches.includes(targetBranch))
    .filter((targetBranch) => targetBranch !== sourceBranch);

  logger.info('Inputs when calculating target branches:', {
    labels,
    branchLabelMapping,
    existingTargetPullRequests,
  });

  logger.info('Target branches inferred from labels:', targetBranches);

  return uniq(targetBranches);
}
