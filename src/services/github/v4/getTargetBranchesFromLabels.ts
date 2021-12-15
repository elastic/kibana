import { uniq } from 'lodash';
import { ValidConfigOptions } from '../../../options/options';
import { filterNil } from '../../../utils/filterEmpty';
import { ExistingTargetPullRequests } from '../../sourceCommit';

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
  sourceBranch?: string;
  existingTargetPullRequests: ExistingTargetPullRequests;
  branchLabelMapping: ValidConfigOptions['branchLabelMapping'];
  labels?: string[];
}) {
  if (!sourceBranch || !branchLabelMapping || !labels) {
    return { expected: [], missing: [], unmerged: [], merged: [] };
  }

  const existingTargetBranches = existingTargetPullRequests.map(
    (pr) => pr.branch
  );

  const unmerged = existingTargetPullRequests
    .filter((pr) => pr.state !== 'MERGED')
    .map((pr) => pr.branch);

  const merged = existingTargetPullRequests
    .filter((pr) => pr.state === 'MERGED')
    .map((pr) => pr.branch);

  const expectedTargetBranches = labels
    .map((label) => getTargetBranchForLabel({ branchLabelMapping, label }))
    .filter(filterNil)
    .filter((targetBranch) => targetBranch !== sourceBranch);

  const expected = uniq(expectedTargetBranches);
  const missing = expected.filter(
    (targetBranch) => !existingTargetBranches.includes(targetBranch)
  );

  return { expected, missing, unmerged, merged };
}
