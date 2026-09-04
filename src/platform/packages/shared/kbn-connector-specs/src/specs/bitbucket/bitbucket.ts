/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Bitbucket Cloud Connector (v2)
 *
 * Drives the pull-request, branch, commit-status, and pipeline lifecycle on a
 * Bitbucket Cloud workspace via the REST API 2.0
 * (https://developer.atlassian.com/cloud/bitbucket/rest/).
 *
 * Auth: Basic (Atlassian account email + scoped API token) or Bearer
 * (Bitbucket repository/project/workspace access token, or a scoped API token).
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { AxiosError } from 'axios';
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import type {
  AddPullRequestCommentInput,
  ApprovePullRequestInput,
  BitbucketAccount,
  BitbucketBranch,
  BitbucketComment,
  BitbucketCommit,
  BitbucketCommitStatus,
  BitbucketPaginated,
  BitbucketParticipant,
  BitbucketPipeline,
  BitbucketPullRequest,
  BitbucketRepository,
  CreateBranchInput,
  CreateCommitBuildStatusInput,
  CreatePullRequestInput,
  DeclinePullRequestInput,
  DeleteBranchInput,
  GetBranchInput,
  GetCommitInput,
  GetPipelineInput,
  GetPullRequestInput,
  ListCommitsInput,
  ListPullRequestsInput,
  ListRepositoriesInput,
  MergePullRequestInput,
  StopPipelineInput,
  TriggerPipelineInput,
  UpdatePullRequestInput,
} from './types';
import {
  AddPullRequestCommentInputSchema,
  ApprovePullRequestInputSchema,
  CreateBranchInputSchema,
  CreateCommitBuildStatusInputSchema,
  CreatePullRequestInputSchema,
  DeclinePullRequestInputSchema,
  DeleteBranchInputSchema,
  GetBranchInputSchema,
  GetCommitInputSchema,
  GetPipelineInputSchema,
  GetPullRequestInputSchema,
  ListCommitsInputSchema,
  ListPullRequestsInputSchema,
  ListRepositoriesInputSchema,
  MergePullRequestInputSchema,
  StopPipelineInputSchema,
  TriggerPipelineInputSchema,
  UpdatePullRequestInputSchema,
} from './types';

const BITBUCKET_API_BASE_URL = 'https://api.bitbucket.org/2.0';
const BITBUCKET_WEB_BASE_URL = 'https://bitbucket.org';

const getWorkspace = (ctx: ActionContext): string => {
  const workspace = (ctx.config?.workspace as string | undefined)?.trim();
  if (!workspace) {
    throw new Error('Bitbucket connector is missing the required workspace configuration field.');
  }
  return workspace;
};

/** Base URL for every repository-scoped endpoint, with workspace and slug URL-encoded. */
const buildRepoUrl = (ctx: ActionContext, repoSlug: string): string =>
  `${BITBUCKET_API_BASE_URL}/repositories/${encodeURIComponent(
    getWorkspace(ctx)
  )}/${encodeURIComponent(repoSlug)}`;

const buildPullRequestUrl = (ctx: ActionContext, repoSlug: string, pullRequestId: number) =>
  `${buildRepoUrl(ctx, repoSlug)}/pullrequests/${pullRequestId}`;

/** Bitbucket requires UUIDs in path segments and bodies to be wrapped in braces. */
const withBraces = (uuid: string): string => {
  const trimmed = uuid.trim();
  return trimmed.startsWith('{') ? trimmed : `{${trimmed}}`;
};

const formatBitbucketError = (action: string, error: unknown): Error => {
  const err = error as AxiosError<{ error?: { message?: string; detail?: string } }>;
  const apiError = err.response?.data?.error;
  const detail = [apiError?.message, apiError?.detail].filter(Boolean).join(' - ') || err.message;
  return new Error(
    `Bitbucket ${action} failed (status ${err.response?.status ?? 'unknown'}): ${detail}`
  );
};

const runAction = async <T>(action: string, fn: () => Promise<T>): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    throw formatBitbucketError(action, error);
  }
};

// Bitbucket responses carry a lot of link and avatar noise, so every action
// trims its output to a curated, camelCase shape that is cheap for an agent
// or workflow to reason about.

const toAccountSummary = (account?: BitbucketAccount | null) =>
  account
    ? {
        displayName: account.display_name,
        uuid: account.uuid,
        nickname: account.nickname,
        accountId: account.account_id,
      }
    : undefined;

const toParticipantSummary = (participant: BitbucketParticipant) => ({
  user: toAccountSummary(participant.user),
  role: participant.role,
  approved: participant.approved,
  state: participant.state,
  participatedOn: participant.participated_on,
});

const toPullRequestSummary = (pr: BitbucketPullRequest) => {
  // Bitbucket only includes reviewers and participants on the single pull request
  // endpoint; list responses omit them. Leave those fields undefined (rather than
  // an empty list or a zero count) when they were not returned.
  const participants = pr.participants?.map(toParticipantSummary);
  return {
    id: pr.id,
    title: pr.title,
    description: pr.description,
    state: pr.state,
    draft: pr.draft,
    url: pr.links?.html?.href,
    author: toAccountSummary(pr.author),
    sourceBranch: pr.source?.branch?.name,
    sourceCommit: pr.source?.commit?.hash,
    sourceRepository: pr.source?.repository?.full_name,
    destinationBranch: pr.destination?.branch?.name,
    destinationCommit: pr.destination?.commit?.hash,
    reviewers: pr.reviewers?.map(toAccountSummary),
    participants,
    approvalCount: participants?.filter((participant) => participant.approved).length,
    mergeCommit: pr.merge_commit?.hash,
    closeSourceBranch: pr.close_source_branch,
    closedBy: toAccountSummary(pr.closed_by),
    declineReason: pr.reason,
    commentCount: pr.comment_count,
    taskCount: pr.task_count,
    createdOn: pr.created_on,
    updatedOn: pr.updated_on,
  };
};

const toCommitSummary = (commit?: BitbucketCommit) =>
  commit
    ? {
        hash: commit.hash,
        message: commit.message,
        date: commit.date,
        author: {
          raw: commit.author?.raw,
          user: toAccountSummary(commit.author?.user),
        },
        parents: (commit.parents ?? []).map((parent) => parent.hash),
        url: commit.links?.html?.href,
      }
    : undefined;

const toBranchSummary = (branch: BitbucketBranch) => ({
  name: branch.name,
  target: toCommitSummary(branch.target),
  defaultMergeStrategy: branch.default_merge_strategy,
  mergeStrategies: branch.merge_strategies,
  url: branch.links?.html?.href,
});

const toCommentSummary = (comment: BitbucketComment) => ({
  id: comment.id,
  content: comment.content?.raw,
  user: toAccountSummary(comment.user),
  inline: comment.inline
    ? { path: comment.inline.path, from: comment.inline.from, to: comment.inline.to }
    : undefined,
  parentId: comment.parent?.id,
  deleted: comment.deleted,
  url: comment.links?.html?.href,
  createdOn: comment.created_on,
  updatedOn: comment.updated_on,
});

const toCommitStatusSummary = (status: BitbucketCommitStatus) => ({
  key: status.key,
  state: status.state,
  name: status.name,
  url: status.url,
  description: status.description,
  refname: status.refname,
  createdOn: status.created_on,
  updatedOn: status.updated_on,
});

const toPipelineSummary = (ctx: ActionContext, repoSlug: string, pipeline: BitbucketPipeline) => ({
  uuid: pipeline.uuid,
  buildNumber: pipeline.build_number,
  state: pipeline.state?.name,
  result: pipeline.state?.result?.name,
  stage: pipeline.state?.stage?.name,
  target: {
    type: pipeline.target?.type,
    refType: pipeline.target?.ref_type,
    refName: pipeline.target?.ref_name,
    commit: pipeline.target?.commit?.hash,
    customPipeline:
      pipeline.target?.selector?.type === 'custom' ? pipeline.target.selector.pattern : undefined,
  },
  trigger: pipeline.trigger?.name,
  creator: toAccountSummary(pipeline.creator),
  createdOn: pipeline.created_on,
  completedOn: pipeline.completed_on,
  buildSecondsUsed: pipeline.build_seconds_used,
  url:
    pipeline.build_number !== undefined
      ? `${BITBUCKET_WEB_BASE_URL}/${encodeURIComponent(getWorkspace(ctx))}/${encodeURIComponent(
          repoSlug
        )}/pipelines/results/${pipeline.build_number}`
      : undefined,
});

const toRepositorySummary = (repository: BitbucketRepository) => ({
  slug: repository.slug,
  name: repository.name,
  fullName: repository.full_name,
  description: repository.description,
  isPrivate: repository.is_private,
  language: repository.language,
  mainBranch: repository.mainbranch?.name,
  project: repository.project?.key,
  url: repository.links?.html?.href,
  createdOn: repository.created_on,
  updatedOn: repository.updated_on,
});

const toPage = <T, U>(data: BitbucketPaginated<T>, mapItem: (item: T) => U) => ({
  values: (data.values ?? []).map(mapItem),
  page: data.page,
  pageSize: data.pagelen,
  size: data.size,
  hasMore: Boolean(data.next),
});

const toReviewerRefs = (uuids: string[]) => uuids.map((uuid) => ({ uuid: withBraces(uuid) }));

export const Bitbucket: ConnectorSpec = {
  metadata: {
    id: '.bitbucket',
    displayName: 'Bitbucket',
    description: i18n.translate('core.kibanaConnectorSpecs.bitbucket.metadata.description', {
      defaultMessage:
        'Open, review, comment on, and merge pull requests, create branches, report commit build statuses, and trigger pipelines in Bitbucket Cloud',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    // A new connector type must reach Production-NonCanary before it can declare
    // user-facing features; 'workflows' is added in a follow-up PR.
    supportedFeatureIds: ['agentBuilder'],
  },

  auth: {
    types: [
      {
        type: 'basic',
        isRecommended: true,
        defaults: {},
        overrides: {
          label: i18n.translate('core.kibanaConnectorSpecs.bitbucket.auth.basic.label', {
            defaultMessage: 'Atlassian email and API token',
          }),
          meta: {
            username: {
              label: i18n.translate(
                'core.kibanaConnectorSpecs.bitbucket.auth.basic.username.label',
                { defaultMessage: 'Atlassian account email' }
              ),
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.bitbucket.auth.basic.username.helpText',
                {
                  defaultMessage:
                    'The email address of the Atlassian account that owns the API token. Every action runs as this account.',
                }
              ),
            },
            password: {
              label: i18n.translate(
                'core.kibanaConnectorSpecs.bitbucket.auth.basic.password.label',
                { defaultMessage: 'API token' }
              ),
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.bitbucket.auth.basic.password.helpText',
                {
                  defaultMessage:
                    'An Atlassian API token created with scopes for the Bitbucket app (id.atlassian.com, Security, API tokens, Create API token with scopes). Tokens without scopes are rejected by Bitbucket. Grant read:repository:bitbucket, write:repository:bitbucket, read:pullrequest:bitbucket, write:pullrequest:bitbucket, read:pipeline:bitbucket, and write:pipeline:bitbucket.',
                }
              ),
            },
          },
        },
      },
      {
        type: 'bearer',
        defaults: {},
        overrides: {
          label: i18n.translate('core.kibanaConnectorSpecs.bitbucket.auth.bearer.label', {
            defaultMessage: 'Access token',
          }),
          meta: {
            token: {
              label: i18n.translate('core.kibanaConnectorSpecs.bitbucket.auth.bearer.token.label', {
                defaultMessage: 'Access token',
              }),
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.bitbucket.auth.bearer.token.helpText',
                {
                  defaultMessage:
                    'A Bitbucket repository, project, or workspace access token with the repository:write, pullrequest:write, and pipeline:write scopes, or a scoped Atlassian API token (see the API token option). Access tokens act as a service identity, not a user, so they cannot approve pull requests.',
                }
              ),
            },
          },
        },
      },
    ],
  },

  schema: lazySchema(() =>
    z.object({
      workspace: z
        .string()
        .min(1)
        .max(200)
        .describe('The Bitbucket workspace slug that every action in this connector runs against')
        .meta({
          widget: 'text',
          label: i18n.translate('core.kibanaConnectorSpecs.bitbucket.config.workspace.label', {
            defaultMessage: 'Workspace',
          }),
          placeholder: 'my-workspace',
          helpText: i18n.translate(
            'core.kibanaConnectorSpecs.bitbucket.config.workspace.helpText',
            {
              defaultMessage:
                'The workspace slug found in repository URLs: bitbucket.org/your-workspace/your-repo. Every action in this connector runs against this workspace; repositories are addressed by slug.',
            }
          ),
        }),
    })
  ),

  actions: {
    // =========================================================================
    // Discovery
    // =========================================================================

    listRepositories: {
      isTool: true,
      scope: 'read',
      description:
        "List the repositories in the configured workspace, optionally filtered with a Bitbucket query or by the caller's role. Returns each repository's slug, name, main branch, project, and URL. Use this to discover the repoSlug value every other action needs when you do not already know it.",
      input: ListRepositoriesInputSchema,
      handler: async (ctx, input: ListRepositoriesInput) =>
        runAction('listRepositories', async () => {
          const response = await ctx.client.get<BitbucketPaginated<BitbucketRepository>>(
            `${BITBUCKET_API_BASE_URL}/repositories/${encodeURIComponent(getWorkspace(ctx))}`,
            {
              params: {
                q: input.query,
                role: input.role,
                sort: input.sort,
                page: input.page,
                pagelen: input.pageSize,
              },
            }
          );
          return toPage(response.data, toRepositorySummary);
        }),
    },

    // =========================================================================
    // Pull requests
    // =========================================================================

    createPullRequest: {
      isTool: true,
      scope: 'write',
      description:
        'Open a pull request from a source branch to a destination branch (the repository main branch when omitted), with optional description, reviewers, draft flag, and close-source-branch setting. Returns the new pull request including its id and URL. This is the primary way a workflow proposes a change, such as a remediation branch, for review.',
      input: CreatePullRequestInputSchema,
      handler: async (ctx, input: CreatePullRequestInput) =>
        runAction('createPullRequest', async () => {
          const response = await ctx.client.post<BitbucketPullRequest>(
            `${buildRepoUrl(ctx, input.repoSlug)}/pullrequests`,
            {
              title: input.title,
              description: input.description,
              source: { branch: { name: input.sourceBranch } },
              destination: input.destinationBranch
                ? { branch: { name: input.destinationBranch } }
                : undefined,
              reviewers: input.reviewers ? toReviewerRefs(input.reviewers) : undefined,
              close_source_branch: input.closeSourceBranch,
              draft: input.draft,
            }
          );
          return toPullRequestSummary(response.data);
        }),
    },

    getPullRequest: {
      isTool: true,
      scope: 'read',
      description:
        'Get a single pull request by id, including its state (OPEN, MERGED, DECLINED, SUPERSEDED), source and destination branches and commits, reviewers, participants with their approval status, approval count, and merge commit. Use this to decide whether a pull request is ready to merge or to find reviewer UUIDs.',
      input: GetPullRequestInputSchema,
      handler: async (ctx, input: GetPullRequestInput) =>
        runAction('getPullRequest', async () => {
          const response = await ctx.client.get<BitbucketPullRequest>(
            buildPullRequestUrl(ctx, input.repoSlug, input.pullRequestId)
          );
          return toPullRequestSummary(response.data);
        }),
    },

    listPullRequests: {
      isTool: true,
      scope: 'read',
      description:
        'List pull requests in a repository, filtered by one or more states (defaults to OPEN only) and an optional Bitbucket query that is combined with the state filter, with sorting and pagination. Returns pull request summaries with id, title, state, branches, and author; reviewers, participants, and approvalCount are only available from getPullRequest. Use this to find pull requests to review, merge, or clean up.',
      input: ListPullRequestsInputSchema,
      handler: async (ctx, input: ListPullRequestsInput) =>
        runAction('listPullRequests', async () => {
          const states = input.state ?? ['OPEN'];
          // Bitbucket ignores the `state` query params (and its OPEN-only default)
          // whenever a `q` filter is present, so fold the states into `q` in that case.
          const stateClause = `(${states.map((state) => `state = "${state}"`).join(' OR ')})`;
          const response = await ctx.client.get<BitbucketPaginated<BitbucketPullRequest>>(
            `${buildRepoUrl(ctx, input.repoSlug)}/pullrequests`,
            {
              params: {
                state: input.query ? undefined : states,
                q: input.query ? `${stateClause} AND (${input.query})` : undefined,
                sort: input.sort,
                page: input.page,
                pagelen: input.pageSize,
              },
              // Bitbucket expects repeated keys (state=OPEN&state=MERGED), not state[]=...
              paramsSerializer: { indexes: null },
            }
          );
          return toPage(response.data, toPullRequestSummary);
        }),
    },

    updatePullRequest: {
      isTool: true,
      scope: 'destroy',
      description:
        "Edit an open pull request's title, description, destination branch, or reviewer list. Only the fields you provide change; the current values are preserved for the rest. Returns the updated pull request. Use this to refine a proposal after opening it, for example to add reviewers once a check has passed.",
      input: UpdatePullRequestInputSchema,
      handler: async (ctx, input: UpdatePullRequestInput) =>
        runAction('updatePullRequest', async () => {
          const url = buildPullRequestUrl(ctx, input.repoSlug, input.pullRequestId);
          // Bitbucket's PUT keeps omitted title/description values, but reviewer handling
          // on omission is undocumented, so read the current values first and always send
          // the full set to guarantee nothing the caller left out gets cleared.
          const current = await ctx.client.get<BitbucketPullRequest>(url);
          const currentReviewers = (current.data.reviewers ?? [])
            .map((reviewer) => reviewer.uuid)
            .filter((uuid): uuid is string => typeof uuid === 'string');
          const response = await ctx.client.put<BitbucketPullRequest>(url, {
            title: input.title ?? current.data.title,
            description: input.description ?? current.data.description ?? '',
            reviewers: toReviewerRefs(input.reviewers ?? currentReviewers),
            destination: input.destinationBranch
              ? { branch: { name: input.destinationBranch } }
              : undefined,
          });
          return toPullRequestSummary(response.data);
        }),
    },

    mergePullRequest: {
      isTool: true,
      scope: 'destroy',
      description:
        'Merge an open pull request into its destination branch, optionally choosing the merge strategy, a commit message, and whether to delete the source branch. Returns the merged pull request including the merge commit hash. Bitbucket enforces branch restrictions and required approvals or builds, so check getPullRequest first if a merge is rejected.',
      input: MergePullRequestInputSchema,
      handler: async (ctx, input: MergePullRequestInput) =>
        runAction('mergePullRequest', async () => {
          const response = await ctx.client.post<BitbucketPullRequest>(
            `${buildPullRequestUrl(ctx, input.repoSlug, input.pullRequestId)}/merge`,
            {
              type: 'pullrequest',
              merge_strategy: input.mergeStrategy,
              message: input.message,
              close_source_branch: input.closeSourceBranch,
            }
          );
          return toPullRequestSummary(response.data);
        }),
    },

    approvePullRequest: {
      isTool: true,
      scope: 'write',
      description:
        "Approve a pull request as the connector's authenticated user, so an automated check can act as an approval gate. Returns the recorded participant entry with approved=true. Requires an Atlassian account token; repository access tokens cannot approve.",
      input: ApprovePullRequestInputSchema,
      handler: async (ctx, input: ApprovePullRequestInput) =>
        runAction('approvePullRequest', async () => {
          const response = await ctx.client.post<BitbucketParticipant>(
            `${buildPullRequestUrl(ctx, input.repoSlug, input.pullRequestId)}/approve`
          );
          return toParticipantSummary(response.data);
        }),
    },

    declinePullRequest: {
      isTool: true,
      scope: 'destroy',
      description:
        'Decline (reject and close) an open pull request without merging it. Returns the pull request in state DECLINED. Use this when an automated gate fails and the proposal should not proceed; add the reason with addPullRequestComment first.',
      input: DeclinePullRequestInputSchema,
      handler: async (ctx, input: DeclinePullRequestInput) =>
        runAction('declinePullRequest', async () => {
          const response = await ctx.client.post<BitbucketPullRequest>(
            `${buildPullRequestUrl(ctx, input.repoSlug, input.pullRequestId)}/decline`
          );
          return toPullRequestSummary(response.data);
        }),
    },

    addPullRequestComment: {
      isTool: true,
      scope: 'write',
      description:
        'Post a comment on a pull request, either as a general comment, an inline comment on a file line in the diff (path plus line), or a threaded reply (parentCommentId). Returns the created comment with its id and URL. Use this to leave automated findings, links, or review notes.',
      input: AddPullRequestCommentInputSchema,
      handler: async (ctx, input: AddPullRequestCommentInput) =>
        runAction('addPullRequestComment', async () => {
          const response = await ctx.client.post<BitbucketComment>(
            `${buildPullRequestUrl(ctx, input.repoSlug, input.pullRequestId)}/comments`,
            {
              content: { raw: input.content },
              inline: input.path ? { path: input.path, to: input.line } : undefined,
              parent: input.parentCommentId ? { id: input.parentCommentId } : undefined,
            }
          );
          return toCommentSummary(response.data);
        }),
    },

    // =========================================================================
    // Branches
    // =========================================================================

    createBranch: {
      isTool: true,
      scope: 'write',
      description:
        'Create a branch pointing at a target commit hash or existing branch name. Returns the new branch and its tip commit. This is the first step for staging a change or cutting a release branch; commit to it through your CI or git tooling, then open a pull request with createPullRequest.',
      input: CreateBranchInputSchema,
      handler: async (ctx, input: CreateBranchInput) =>
        runAction('createBranch', async () => {
          const response = await ctx.client.post<BitbucketBranch>(
            `${buildRepoUrl(ctx, input.repoSlug)}/refs/branches`,
            { name: input.name, target: { hash: input.target } }
          );
          return toBranchSummary(response.data);
        }),
    },

    getBranch: {
      isTool: true,
      scope: 'read',
      description:
        'Get a branch by name, returning its tip commit (hash, message, author, date) and the merge strategies allowed for pull requests targeting it. Use this to check state before acting, for example to get the commit hash for createBranch or createCommitBuildStatus.',
      input: GetBranchInputSchema,
      handler: async (ctx, input: GetBranchInput) =>
        runAction('getBranch', async () => {
          const response = await ctx.client.get<BitbucketBranch>(
            `${buildRepoUrl(ctx, input.repoSlug)}/refs/branches/${encodeURIComponent(input.name)}`
          );
          return toBranchSummary(response.data);
        }),
    },

    deleteBranch: {
      isTool: true,
      scope: 'destroy',
      description:
        'Delete a branch. Use this as a cleanup step for merged or stale remediation branches. The repository main branch cannot be deleted. Returns a confirmation with the deleted branch name.',
      input: DeleteBranchInputSchema,
      handler: async (ctx, input: DeleteBranchInput) =>
        runAction('deleteBranch', async () => {
          await ctx.client.delete(
            `${buildRepoUrl(ctx, input.repoSlug)}/refs/branches/${encodeURIComponent(input.name)}`
          );
          return { deleted: true, name: input.name };
        }),
    },

    // =========================================================================
    // Commits
    // =========================================================================

    getCommit: {
      isTool: true,
      scope: 'read',
      description:
        'Get a commit by hash, returning its message, author (raw string and Bitbucket user when matched), date, parent hashes, and URL. Use this to enrich a workflow step or notification with commit metadata.',
      input: GetCommitInputSchema,
      handler: async (ctx, input: GetCommitInput) =>
        runAction('getCommit', async () => {
          const response = await ctx.client.get<BitbucketCommit>(
            `${buildRepoUrl(ctx, input.repoSlug)}/commit/${encodeURIComponent(input.commit)}`
          );
          return toCommitSummary(response.data);
        }),
    },

    listCommits: {
      isTool: true,
      scope: 'read',
      description:
        'List commits in reverse chronological order starting from a branch, tag, or commit (like git log), optionally limited to commits that touched a file or directory path. Returns paginated commit summaries. Use this to build a changelog or audit trail.',
      input: ListCommitsInputSchema,
      handler: async (ctx, input: ListCommitsInput) =>
        runAction('listCommits', async () => {
          const baseUrl = `${buildRepoUrl(ctx, input.repoSlug)}/commits`;
          const url = input.revision ? `${baseUrl}/${encodeURIComponent(input.revision)}` : baseUrl;
          const response = await ctx.client.get<BitbucketPaginated<BitbucketCommit>>(url, {
            params: { path: input.path, page: input.page, pagelen: input.pageSize },
          });
          return toPage(response.data, (commit) => toCommitSummary(commit));
        }),
    },

    createCommitBuildStatus: {
      isTool: true,
      scope: 'write',
      description:
        'Report an external check result onto a commit as a build status (INPROGRESS, SUCCESSFUL, FAILED, or STOPPED) with a stable key, a details URL, and an optional name and description. Posting the same key again overwrites the earlier status, so report INPROGRESS first and then the final result with the same key. Set refname to the pull request source branch so the status shows on, and can gate, that pull request.',
      input: CreateCommitBuildStatusInputSchema,
      handler: async (ctx, input: CreateCommitBuildStatusInput) =>
        runAction('createCommitBuildStatus', async () => {
          const response = await ctx.client.post<BitbucketCommitStatus>(
            `${buildRepoUrl(ctx, input.repoSlug)}/commit/${encodeURIComponent(
              input.commit
            )}/statuses/build`,
            {
              state: input.state,
              key: input.key,
              url: input.url,
              name: input.name,
              description: input.description,
              refname: input.refname,
            }
          );
          return toCommitStatusSummary(response.data);
        }),
    },

    // =========================================================================
    // Pipelines
    // =========================================================================

    triggerPipeline: {
      isTool: true,
      scope: 'write',
      description:
        'Start a Bitbucket Pipelines run for a branch, a specific commit, or a commit in the context of a branch, optionally selecting a custom pipeline by name and passing variables. Returns the new pipeline with its uuid (use it with getPipeline and stopPipeline), build number, and state. The repository must have Pipelines enabled and a bitbucket-pipelines.yml.',
      input: TriggerPipelineInputSchema,
      handler: async (ctx, input: TriggerPipelineInput) =>
        runAction('triggerPipeline', async () => {
          const commit = input.commit ? { type: 'commit', hash: input.commit } : undefined;
          const selector = input.customPipeline
            ? { type: 'custom', pattern: input.customPipeline }
            : undefined;
          const target = input.branch
            ? {
                type: 'pipeline_ref_target',
                ref_type: 'branch',
                ref_name: input.branch,
                commit,
                selector,
              }
            : { type: 'pipeline_commit_target', commit, selector };
          const response = await ctx.client.post<BitbucketPipeline>(
            `${buildRepoUrl(ctx, input.repoSlug)}/pipelines`,
            {
              target,
              variables: input.variables?.map((variable) => ({
                key: variable.key,
                value: variable.value,
                secured: variable.secured ?? false,
              })),
            }
          );
          return toPipelineSummary(ctx, input.repoSlug, response.data);
        }),
    },

    getPipeline: {
      isTool: true,
      scope: 'read',
      description:
        'Get a pipeline run by uuid, returning its state (PARSING, PENDING, IN_PROGRESS, or COMPLETED), the result once completed (SUCCESSFUL, FAILED, STOPPED, ERROR, or EXPIRED), the in-progress stage, target, timing, and URL. Poll this after triggerPipeline until state is COMPLETED, then branch on result.',
      input: GetPipelineInputSchema,
      handler: async (ctx, input: GetPipelineInput) =>
        runAction('getPipeline', async () => {
          const response = await ctx.client.get<BitbucketPipeline>(
            `${buildRepoUrl(ctx, input.repoSlug)}/pipelines/${encodeURIComponent(
              withBraces(input.pipelineUuid)
            )}`
          );
          return toPipelineSummary(ctx, input.repoSlug, response.data);
        }),
    },

    stopPipeline: {
      isTool: true,
      scope: 'destroy',
      description:
        'Stop a pending or running pipeline and all of its unfinished steps. Returns a confirmation; Bitbucket rejects the request if the pipeline has already completed. Use this to halt a superseded or misfired CI run from a workflow.',
      input: StopPipelineInputSchema,
      handler: async (ctx, input: StopPipelineInput) =>
        runAction('stopPipeline', async () => {
          const uuid = withBraces(input.pipelineUuid);
          await ctx.client.post(
            `${buildRepoUrl(ctx, input.repoSlug)}/pipelines/${encodeURIComponent(
              uuid
            )}/stopPipeline`
          );
          return { stopped: true, uuid };
        }),
    },
  },

  skill: [
    'Bitbucket Cloud - cross-action guidance for driving pull requests, branches, and pipelines from a workflow.',
    '',
    'Every action runs against the workspace configured on the connector; supply only the repository slug plus the pull request, branch, commit, or pipeline identifier. Call `listRepositories` when the slug is unknown.',
    '',
    'Identifiers: pull requests use an integer `id`; pipelines use a braces-wrapped `uuid` (build numbers are for display only); users are referenced by `uuid` (with braces), not by username or email; commits use their SHA.',
    '',
    'Typical patterns:',
    '  - Propose a change: `getBranch` (main) to get the tip hash, `createBranch` from it, push commits through git/CI tooling, then `createPullRequest` from the new branch. Add reviewers by UUID at creation or later with `updatePullRequest`.',
    '  - Gate a pull request: `getPullRequest` to read `sourceCommit` and `sourceBranch`, run your check, then `createCommitBuildStatus` with `refname` set to the source branch (INPROGRESS first, then SUCCESSFUL/FAILED with the same `key`). Approve with `approvePullRequest` or reject with `addPullRequestComment` + `declinePullRequest`.',
    '  - Land a change: confirm `state` is OPEN and `approvalCount`/statuses satisfy your policy via `getPullRequest`, then `mergePullRequest` (optionally `closeSourceBranch: true`); otherwise clean up later with `deleteBranch`.',
    '  - Run CI on demand: `triggerPipeline` for a branch or commit (add `customPipeline` and `variables` for custom pipelines), then poll `getPipeline` until `state` is COMPLETED and branch on `result` (SUCCESSFUL, FAILED, STOPPED, ERROR, EXPIRED). Use `stopPipeline` to abort a run that is no longer needed.',
    '  - Review or cleanup pass: `listPullRequests` with `state: ["OPEN"]` (default) or `["MERGED", "DECLINED"]` and a `query` such as `source.branch.name ~ "remediation/"`, then act on each `id`. List results omit reviewers, participants, and `approvalCount`; call `getPullRequest` for those.',
    '',
    'Pagination: list actions return `values`, `page`, `pageSize`, and `hasMore`; request the next page by incrementing `page`. `size` (total count) is omitted by Bitbucket when it is expensive to compute.',
    '',
    'Gotchas: `mergePullRequest` fails with 4xx when branch restrictions, required approvals, or required builds are unmet - inspect `getPullRequest` and the error message rather than retrying. `triggerPipeline` returns 404 if Pipelines is not enabled on the repository. Repository access tokens (bearer) act as a service identity and cannot `approvePullRequest`.',
  ].join('\n'),

  test: {
    enabled: true,
    description: i18n.translate('core.kibanaConnectorSpecs.bitbucket.test.description', {
      defaultMessage:
        'Verifies the connection to Bitbucket Cloud by listing repositories in the configured workspace.',
    }),
    handler: async (ctx) =>
      runAction('test', async () => {
        const workspace = getWorkspace(ctx);
        const response = await ctx.client.get<BitbucketPaginated<BitbucketRepository>>(
          `${BITBUCKET_API_BASE_URL}/repositories/${encodeURIComponent(workspace)}`,
          { params: { pagelen: 1 } }
        );
        const hasRepositories = (response.data.values?.length ?? 0) > 0;
        return {
          message: hasRepositories
            ? `Connected to Bitbucket workspace "${workspace}".`
            : `Connected to Bitbucket workspace "${workspace}", but no repositories are visible. Verify the workspace slug and that the token has the read:repository:bitbucket scope.`,
        };
      }),
  },
};
