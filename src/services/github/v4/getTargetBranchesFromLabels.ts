import flatMap from 'lodash.flatmap';
import uniq from 'lodash.uniq';
import { BackportOptions } from '../../../options/options';
import { filterNil } from '../../../utils/filterEmpty';
import { ExistingTargetPullRequests } from './getExistingTargetPullRequests';

export function getTargetBranchesFromLabels({
  existingTargetPullRequests,
  branchLabelMapping,
  labels,
}: {
  existingTargetPullRequests: ExistingTargetPullRequests;
  branchLabelMapping: BackportOptions['branchLabelMapping'];
  labels?: string[];
}) {
  if (!branchLabelMapping || !labels) {
    return [];
  }

  const existingBranches = existingTargetPullRequests.map((pr) => pr.branch);

  const targetBranches = flatMap(labels, (label) => {
    // only get first match
    const result = Object.entries(branchLabelMapping).find(([labelPattern]) => {
      const regex = new RegExp(labelPattern);
      const isMatch = label.match(regex) !== null;
      return isMatch;
    });

    if (result) {
      const [labelPattern, targetBranch] = result;
      const regex = new RegExp(labelPattern);
      return label.replace(regex, targetBranch);
    }
  })
    .filter((targetBranch) => targetBranch !== '')
    .filter(filterNil)
    .filter((targetBranch) => !existingBranches.includes(targetBranch));

  return uniq(targetBranches);
}
