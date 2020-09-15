import difference from 'lodash.difference';
import { ValidConfigOptions } from '../../../options/options';
import { apiRequestV4 } from './apiRequestV4';
import { fetchDefaultBranch } from './fetchDefaultBranch';
import {
  pullRequestFragment,
  pullRequestFragmentName,
  PullRequestNode,
  getExistingTargetPullRequests,
  getPullRequestLabels,
} from './getExistingTargetPullRequests';
import { getTargetBranchesFromLabels } from './getTargetBranchesFromLabels';

export async function fetchMergedPullRequests(
  options: ValidConfigOptions,
  dateRange: { since: string; until: string }
) {
  const { accessToken, githubApiBaseUrlV4, repoName, repoOwner } = options;
  const query = /* GraphQL */ `
  query CommitsSinceDate($repoOwner: String!, $repoName: String!, $commitsCount: Int!, $sourceBranch: String!, $since: GitTimestamp!, $until: GitTimestamp!) {
    repository(owner: $repoOwner, name: $repoName) {
      id
      ref(qualifiedName: $sourceBranch) {
        target {
          ... on Commit {
            history(first: $commitsCount, since: $since, until: $until) {
              totalCount
              edges {
                node {
                  oid
                  message
                  associatedPullRequests(first: 1) {
                    edges {
                      node {
                        ...${pullRequestFragmentName}
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }

    ${pullRequestFragment}
  `;

  const defaultBranch = await fetchDefaultBranch(options);

  const res = await apiRequestV4<DataResponse>({
    githubApiBaseUrlV4,
    accessToken,
    query,
    variables: {
      repoOwner,
      repoName,
      commitsCount: 50,
      sourceBranch: defaultBranch,
      since: dateRange.since,
      until: dateRange.until,
    },
  });

  return res.repository.ref?.target.history.edges
    .filter(
      (commitEdge) => !!commitEdge.node.associatedPullRequests.edges[0]?.node
    )
    .map((commitEdge) => {
      const pullRequestNode =
        commitEdge.node.associatedPullRequests.edges[0].node;

      const existingTargetPullRequests = getExistingTargetPullRequests(
        pullRequestNode
      );

      const expectedTargetBranches = getTargetBranchesFromLabels({
        sourceBranch: pullRequestNode.baseRefName,
        existingTargetPullRequests: [],
        branchLabelMapping: options.branchLabelMapping,
        labels: getPullRequestLabels(pullRequestNode),
      });

      const mergedTargetBranches = existingTargetPullRequests
        .filter((pr) => pr.state === 'MERGED')
        .map((pr) => pr.branch);

      const remainingTargetBranches = difference(
        expectedTargetBranches,
        mergedTargetBranches
      );

      return {
        sourcePullNumber: pullRequestNode.number,
        existingTargetPullRequests,
        expectedTargetBranches,
        remainingTargetBranches,
      };
    })
    .filter((res) => {
      return res.remainingTargetBranches.length > 0;
    });
}

export interface DataResponse {
  repository: {
    ref: {
      target: {
        history: {
          edges: HistoryEdge[];
        };
      };
    } | null;
  };
}

interface HistoryEdge {
  node: {
    oid: string;
    message: string;
    associatedPullRequests: {
      edges: {
        node: PullRequestNode;
      }[];
    };
  };
}
