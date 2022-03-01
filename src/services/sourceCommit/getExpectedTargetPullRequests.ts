import { uniq } from 'lodash';
import { ValidConfigOptions } from '../../options/options';
import { filterNil } from '../../utils/filterEmpty';
import { getFirstLine } from '../github/commitFormatters';
import { parseRemoteConfig } from '../remoteConfig';
import {
  SourcePullRequestNode,
  SourceCommitWithTargetPullRequest,
  TimelineEdge,
  TimelinePullRequestEdge,
} from './parseSourceCommit';

export type ExpectedTargetPullRequest = {
  url?: string;
  number?: number;
  branch: string;
  state: 'OPEN' | 'CLOSED' | 'MERGED' | 'NOT_CREATED';
  mergeCommit?: {
    sha: string;
    message: string;
  };
};

export function getExpectedTargetPullRequests({
  sourceCommit,
  latestBranchLabelMapping,
}: {
  sourceCommit: SourceCommitWithTargetPullRequest;
  latestBranchLabelMapping: ValidConfigOptions['branchLabelMapping'];
}): ExpectedTargetPullRequest[] {
  const sourcePullRequest =
    sourceCommit.associatedPullRequests.edges?.[0]?.node;

  const remoteConfig =
    sourcePullRequest?.mergeCommit.remoteConfigHistory.edges?.[0]?.remoteConfig;

  const branchLabelMapping =
    (remoteConfig && parseRemoteConfig(remoteConfig)?.branchLabelMapping) ??
    latestBranchLabelMapping;

  // if there is no source pull request the commit was pushed directly to the source branch
  // in that case there will be no labels, and thus not possible to deduce the expected target branches
  if (!sourcePullRequest) {
    return [];
  }

  const existingTargetPullRequests = getExistingTargetPullRequests(
    sourceCommit,
    sourcePullRequest
  );

  // if there's no `branchLabelMapping`, it's not possible to deduce the missing target branches
  if (!branchLabelMapping) {
    return existingTargetPullRequests;
  }

  const missingTargetPullRequests = getMissingTargetPullRequests(
    sourcePullRequest,
    existingTargetPullRequests,
    branchLabelMapping
  );

  return [...existingTargetPullRequests, ...missingTargetPullRequests];
}

function getExistingTargetPullRequests(
  sourceCommit: SourceCommitWithTargetPullRequest,
  sourcePullRequest: SourcePullRequestNode
): ExpectedTargetPullRequest[] {
  const sourceCommitMessage = getFirstLine(sourceCommit.message);

  return sourcePullRequest.timelineItems.edges
    .filter(filterNil)
    .filter(filterPullRequests)
    .filter((item) => {
      const { targetPullRequest } = item.node;

      // ignore closed PRs
      if (targetPullRequest.state === 'CLOSED') {
        return false;
      }

      // at least one of the commits in `targetPullRequest` should match the merge commit from the source pull request
      const didCommitMatch = targetPullRequest.commits.edges.some(
        (commitEdge) => {
          const { targetCommit } = commitEdge.node;

          const matchingRepoName =
            sourceCommit.repository.name === targetPullRequest.repository.name;

          const matchingRepoOwner =
            sourceCommit.repository.owner.login ===
            targetPullRequest.repository.owner.login;

          const targetCommitMessage = getFirstLine(targetCommit.message);

          const matchingMessage = targetCommitMessage === sourceCommitMessage;
          return matchingRepoName && matchingRepoOwner && matchingMessage;
        }
      );

      const titleIncludesMessage =
        targetPullRequest.title.includes(sourceCommitMessage);

      const titleIncludesNumber = targetPullRequest.title.includes(
        sourcePullRequest.number.toString()
      );

      return didCommitMatch || (titleIncludesMessage && titleIncludesNumber);
    })
    .map((item) => {
      const { targetPullRequest } = item.node;
      return {
        url: targetPullRequest.url,
        number: targetPullRequest.number,
        branch: targetPullRequest.baseRefName,
        state: targetPullRequest.state,
        mergeCommit: targetPullRequest.targetMergeCommit
          ? {
              sha: targetPullRequest.targetMergeCommit.sha,
              message: targetPullRequest.targetMergeCommit.message,
            }
          : undefined,
      };
    });
}

function getMissingTargetPullRequests(
  sourcePullRequest: SourcePullRequestNode,
  existingTargetPullRequests: ExpectedTargetPullRequest[],
  branchLabelMapping: NonNullable<ValidConfigOptions['branchLabelMapping']>
): ExpectedTargetPullRequest[] {
  const labels = sourcePullRequest.labels.nodes.map((label) => label.name);
  const targetBranchesFromLabels = labels
    .map((label) => getTargetBranchForLabel({ branchLabelMapping, label }))
    .filter(filterNil)
    .filter((targetBranch) => targetBranch !== sourcePullRequest.baseRefName);

  const expectedTargetBranches = existingTargetPullRequests.map(
    (pr) => pr.branch
  );
  const expected = uniq(targetBranchesFromLabels);
  return expected
    .filter((targetBranch) => !expectedTargetBranches.includes(targetBranch))
    .map((branch) => {
      return { branch, state: 'NOT_CREATED' as const };
    });
}

// narrow TimelineEdge to TimelinePullRequestEdge
function filterPullRequests(
  item: TimelineEdge
): item is TimelinePullRequestEdge {
  const { targetPullRequest } = item.node;
  return targetPullRequest.__typename === 'PullRequest';
}

function getTargetBranchForLabel({
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
