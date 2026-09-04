/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

// =============================================================================
// Shared field builders
// =============================================================================

const repoSlug = () =>
  z
    .string()
    .min(1)
    .max(200)
    .describe(
      'The repository slug: the last path segment of the repository URL, e.g. "my-repo" for bitbucket.org/my-workspace/my-repo. Use listRepositories to discover slugs.'
    );

const pullRequestId = () =>
  z
    .number()
    .int()
    .positive()
    .describe(
      'The numeric pull request ID shown in the Bitbucket UI and returned by createPullRequest and listPullRequests (e.g. 42). IDs are only unique within a repository.'
    );

const branchName = () =>
  z
    .string()
    .min(1)
    .max(255)
    .describe(
      'A git branch name without the refs/heads prefix, e.g. "main" or "fix/config-drift".'
    );

const commitHash = () =>
  z
    .string()
    .regex(/^[0-9a-fA-F]{7,40}$/, 'Must be a 7 to 40 character hexadecimal commit hash.')
    .describe(
      "The commit SHA (full 40-character hash preferred; at least 7 characters). Get it from getBranch, getCommit, listCommits, or a pull request's sourceCommit."
    );

const userUuid = () =>
  z
    .string()
    .min(1)
    .max(64)
    .describe(
      'A Bitbucket user UUID, with or without surrounding braces, e.g. "{504c3b62-8120-4f0c-a7bc-87800b9d6f70}". Find UUIDs in the author, reviewers, and participants of getPullRequest, or the author of getCommit.'
    );

const pipelineUuid = () =>
  z
    .string()
    .min(1)
    .max(64)
    .describe(
      'The pipeline UUID returned by triggerPipeline, with or without surrounding braces, e.g. "{2f4f7fd3-4d6e-4a8b-9b4f-1b2d3e4f5a6b}". This is NOT the integer build number.'
    );

const page = () =>
  z.number().int().min(1).optional().describe('Page number for pagination (min 1, default 1).');

const pageSize = () =>
  z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe('Results per page (min 1, max 100, default 10).');

const sort = () =>
  z
    .string()
    .max(100)
    .optional()
    .describe(
      'Field to sort by, prefixed with "-" for descending order, e.g. "-updated_on" or "created_on".'
    );

// =============================================================================
// Repositories
// =============================================================================

export const ListRepositoriesInputSchema = lazySchema(() =>
  z.object({
    query: z
      .string()
      .max(1000)
      .optional()
      .describe(
        'Optional Bitbucket query filter, e.g. \'name ~ "api"\' or \'project.key = "PROJ"\'. Uses the Bitbucket REST filtering syntax.'
      ),
    role: z
      .enum(['owner', 'admin', 'contributor', 'member'])
      .optional()
      .describe(
        'Only return repositories where the authenticated user has at least this role: "owner", "admin", "contributor", or "member".'
      ),
    sort: sort(),
    page: page(),
    pageSize: pageSize(),
  })
);
export type ListRepositoriesInput = z.infer<typeof ListRepositoriesInputSchema>;

// =============================================================================
// Pull requests
// =============================================================================

export const CreatePullRequestInputSchema = lazySchema(() =>
  z.object({
    repoSlug: repoSlug(),
    title: z.string().min(1).max(500).describe('The pull request title.'),
    sourceBranch: branchName().describe(
      'The branch containing the changes to merge (the "from" branch), e.g. "fix/config-drift".'
    ),
    destinationBranch: branchName()
      .optional()
      .describe(
        'The branch to merge into (the "to" branch), e.g. "main". Defaults to the repository\'s main branch when omitted.'
      ),
    description: z
      .string()
      .max(32768)
      .optional()
      .describe('Optional pull request description in Bitbucket markdown.'),
    reviewers: z
      .array(userUuid())
      .max(50)
      .optional()
      .describe('Optional list of reviewer user UUIDs to request review from (max 50).'),
    closeSourceBranch: z
      .boolean()
      .optional()
      .describe(
        'When true, the source branch is deleted automatically once the pull request is merged.'
      ),
    draft: z
      .boolean()
      .optional()
      .describe(
        'When true, the pull request is opened as a draft that cannot be merged until marked ready.'
      ),
  })
);
export type CreatePullRequestInput = z.infer<typeof CreatePullRequestInputSchema>;

export const GetPullRequestInputSchema = lazySchema(() =>
  z.object({
    repoSlug: repoSlug(),
    pullRequestId: pullRequestId(),
  })
);
export type GetPullRequestInput = z.infer<typeof GetPullRequestInputSchema>;

export const ListPullRequestsInputSchema = lazySchema(() =>
  z.object({
    repoSlug: repoSlug(),
    state: z
      .array(z.enum(['OPEN', 'MERGED', 'DECLINED', 'SUPERSEDED']))
      .min(1)
      .max(4)
      .optional()
      .describe(
        'Pull request states to include: any of "OPEN", "MERGED", "DECLINED", "SUPERSEDED". Defaults to only OPEN pull requests when omitted.'
      ),
    query: z
      .string()
      .max(1000)
      .optional()
      .describe(
        'Optional Bitbucket query filter, e.g. \'source.branch.name = "fix/config-drift"\' or \'title ~ "remediation"\'. Uses the Bitbucket REST filtering syntax.'
      ),
    sort: sort(),
    page: page(),
    pageSize: pageSize(),
  })
);
export type ListPullRequestsInput = z.infer<typeof ListPullRequestsInputSchema>;

export const UpdatePullRequestInputSchema = lazySchema(() =>
  z
    .object({
      repoSlug: repoSlug(),
      pullRequestId: pullRequestId(),
      title: z.string().min(1).max(500).optional().describe('New pull request title.'),
      description: z
        .string()
        .max(32768)
        .optional()
        .describe(
          'New pull request description in Bitbucket markdown. Replaces the existing description.'
        ),
      destinationBranch: branchName()
        .optional()
        .describe('Change the branch the pull request will merge into, e.g. "release/1.2".'),
      reviewers: z
        .array(userUuid())
        .max(50)
        .optional()
        .describe(
          'Replace the full reviewer list with these user UUIDs (max 50). Pass an empty array to remove all reviewers. Omit to leave reviewers unchanged.'
        ),
    })
    .refine(
      (value) =>
        value.title !== undefined ||
        value.description !== undefined ||
        value.destinationBranch !== undefined ||
        value.reviewers !== undefined,
      {
        message:
          'At least one of title, description, destinationBranch, or reviewers must be provided.',
      }
    )
);
export type UpdatePullRequestInput = z.infer<typeof UpdatePullRequestInputSchema>;

export const MergePullRequestInputSchema = lazySchema(() =>
  z.object({
    repoSlug: repoSlug(),
    pullRequestId: pullRequestId(),
    mergeStrategy: z
      .enum([
        'merge_commit',
        'squash',
        'fast_forward',
        'squash_fast_forward',
        'rebase_fast_forward',
        'rebase_merge',
      ])
      .optional()
      .describe(
        'Merge strategy: "merge_commit", "squash", "fast_forward", "squash_fast_forward", "rebase_fast_forward", or "rebase_merge". Defaults to the destination branch\'s default strategy. The strategy must be enabled for the destination branch.'
      ),
    message: z
      .string()
      .max(10000)
      .optional()
      .describe('Optional commit message for the resulting merge commit.'),
    closeSourceBranch: z
      .boolean()
      .optional()
      .describe(
        'When true, deletes the source branch after merging. Defaults to the value set when the pull request was created.'
      ),
  })
);
export type MergePullRequestInput = z.infer<typeof MergePullRequestInputSchema>;

export const ApprovePullRequestInputSchema = lazySchema(() =>
  z.object({
    repoSlug: repoSlug(),
    pullRequestId: pullRequestId(),
  })
);
export type ApprovePullRequestInput = z.infer<typeof ApprovePullRequestInputSchema>;

export const DeclinePullRequestInputSchema = lazySchema(() =>
  z.object({
    repoSlug: repoSlug(),
    pullRequestId: pullRequestId(),
  })
);
export type DeclinePullRequestInput = z.infer<typeof DeclinePullRequestInputSchema>;

export const AddPullRequestCommentInputSchema = lazySchema(() =>
  z
    .object({
      repoSlug: repoSlug(),
      pullRequestId: pullRequestId(),
      content: z.string().min(1).max(32768).describe('The comment text in Bitbucket markdown.'),
      path: z
        .string()
        .max(1024)
        .optional()
        .describe(
          'Optional file path to attach the comment to as an inline code comment, e.g. "src/config.yml". Requires the file to be part of the pull request diff.'
        ),
      line: z
        .number()
        .int()
        .positive()
        .optional()
        .describe(
          'Optional line number in the new version of the file for an inline comment. Only valid together with path.'
        ),
      parentCommentId: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Optional ID of an existing comment to reply to, creating a threaded reply.'),
    })
    .refine((value) => value.line === undefined || value.path !== undefined, {
      message: 'line can only be used together with path.',
    })
);
export type AddPullRequestCommentInput = z.infer<typeof AddPullRequestCommentInputSchema>;

// =============================================================================
// Branches
// =============================================================================

export const CreateBranchInputSchema = lazySchema(() =>
  z.object({
    repoSlug: repoSlug(),
    name: branchName().describe(
      'The name of the branch to create, without the refs/heads prefix, e.g. "fix/config-drift".'
    ),
    target: z
      .string()
      .min(1)
      .max(255)
      .describe(
        'The commit to branch from: a full commit hash (preferred, from getBranch or getCommit) or an existing branch name such as "main".'
      ),
  })
);
export type CreateBranchInput = z.infer<typeof CreateBranchInputSchema>;

export const GetBranchInputSchema = lazySchema(() =>
  z.object({
    repoSlug: repoSlug(),
    name: branchName(),
  })
);
export type GetBranchInput = z.infer<typeof GetBranchInputSchema>;

export const DeleteBranchInputSchema = lazySchema(() =>
  z.object({
    repoSlug: repoSlug(),
    name: branchName().describe(
      "The name of the branch to delete, without the refs/heads prefix. The repository's main branch cannot be deleted."
    ),
  })
);
export type DeleteBranchInput = z.infer<typeof DeleteBranchInputSchema>;

// =============================================================================
// Commits
// =============================================================================

export const GetCommitInputSchema = lazySchema(() =>
  z.object({
    repoSlug: repoSlug(),
    commit: commitHash(),
  })
);
export type GetCommitInput = z.infer<typeof GetCommitInputSchema>;

export const ListCommitsInputSchema = lazySchema(() =>
  z.object({
    repoSlug: repoSlug(),
    revision: z
      .string()
      .min(1)
      .max(255)
      .optional()
      .describe(
        'Branch name, tag, or commit hash to list history from (like "git log <revision>"), e.g. "main". Defaults to the repository\'s main branch history when omitted.'
      ),
    path: z
      .string()
      .max(1024)
      .optional()
      .describe(
        'Optional file or directory path; only commits that changed this path are returned, e.g. "src/config.yml" or "src/".'
      ),
    page: page(),
    pageSize: pageSize(),
  })
);
export type ListCommitsInput = z.infer<typeof ListCommitsInputSchema>;

export const CreateCommitBuildStatusInputSchema = lazySchema(() =>
  z.object({
    repoSlug: repoSlug(),
    commit: commitHash(),
    state: z
      .enum(['INPROGRESS', 'SUCCESSFUL', 'FAILED', 'STOPPED'])
      .describe('The status to report: "INPROGRESS", "SUCCESSFUL", "FAILED", or "STOPPED".'),
    key: z
      .string()
      .min(1)
      .max(40)
      .describe(
        'Stable identifier of the check, unique per vendor, e.g. "KIBANA-POLICY-CHECK". Posting again with the same key overwrites the previous status, so reuse the key to move a check from INPROGRESS to SUCCESSFUL or FAILED.'
      ),
    url: z
      .string()
      .url()
      .max(2048)
      .describe(
        'Link shown in Bitbucket next to the status, pointing to details of the check, e.g. a Kibana workflow execution or case URL.'
      ),
    name: z
      .string()
      .max(255)
      .optional()
      .describe('Human-readable name for this particular run, e.g. "Policy check #42".'),
    description: z
      .string()
      .max(2000)
      .optional()
      .describe('Short summary of the result, e.g. "3 findings, 0 critical".'),
    refname: branchName()
      .optional()
      .describe(
        "The branch this status belongs to. Set it to a pull request's source branch so the status appears on (and can gate) that pull request."
      ),
  })
);
export type CreateCommitBuildStatusInput = z.infer<typeof CreateCommitBuildStatusInputSchema>;

// =============================================================================
// Pipelines
// =============================================================================

export const TriggerPipelineInputSchema = lazySchema(() =>
  z
    .object({
      repoSlug: repoSlug(),
      branch: branchName()
        .optional()
        .describe(
          'Branch to run the pipeline for, e.g. "main". Selects the matching pipeline definition in bitbucket-pipelines.yml and builds the branch tip unless commit is also given.'
        ),
      commit: commitHash()
        .optional()
        .describe(
          'Specific commit to build. Combine with branch to build that commit in the context of the branch, or use alone to build the commit directly (requires customPipeline unless the default pipeline applies).'
        ),
      customPipeline: z
        .string()
        .min(1)
        .max(255)
        .optional()
        .describe(
          'Name of a custom pipeline defined under "pipelines: custom:" in bitbucket-pipelines.yml, e.g. "deploy-to-staging". Omit to run the pipeline that matches the branch automatically.'
        ),
      variables: z
        .array(
          z.object({
            key: z.string().min(1).max(200).describe('Variable name, e.g. "TARGET_ENV".'),
            value: z.string().max(4000).describe('Variable value.'),
            secured: z
              .boolean()
              .optional()
              .describe('When true, the value is masked in logs and the API. Defaults to false.'),
          })
        )
        .max(50)
        .optional()
        .describe(
          'Pipeline variables made available to the build (max 50). Typically used together with customPipeline.'
        ),
    })
    .refine((value) => value.branch !== undefined || value.commit !== undefined, {
      message: 'At least one of branch or commit must be provided.',
    })
);
export type TriggerPipelineInput = z.infer<typeof TriggerPipelineInputSchema>;

export const GetPipelineInputSchema = lazySchema(() =>
  z.object({
    repoSlug: repoSlug(),
    pipelineUuid: pipelineUuid(),
  })
);
export type GetPipelineInput = z.infer<typeof GetPipelineInputSchema>;

export const StopPipelineInputSchema = lazySchema(() =>
  z.object({
    repoSlug: repoSlug(),
    pipelineUuid: pipelineUuid(),
  })
);
export type StopPipelineInput = z.infer<typeof StopPipelineInputSchema>;

// =============================================================================
// Bitbucket API response shapes (subset of fields the handlers read)
// =============================================================================

export interface BitbucketLinks {
  html?: { href?: string };
  self?: { href?: string };
}

export interface BitbucketAccount {
  display_name?: string;
  uuid?: string;
  nickname?: string;
  account_id?: string;
}

export interface BitbucketCommit {
  hash: string;
  message?: string;
  date?: string;
  author?: { raw?: string; user?: BitbucketAccount };
  parents?: Array<{ hash: string }>;
  links?: BitbucketLinks;
}

export interface BitbucketBranch {
  name: string;
  target?: BitbucketCommit;
  merge_strategies?: string[];
  default_merge_strategy?: string;
  links?: BitbucketLinks;
}

export interface BitbucketParticipant {
  user?: BitbucketAccount;
  role?: string;
  approved?: boolean;
  state?: string | null;
  participated_on?: string | null;
}

export interface BitbucketPullRequestEndpoint {
  branch?: { name?: string };
  commit?: { hash?: string };
  repository?: { full_name?: string };
}

export interface BitbucketPullRequest {
  id: number;
  title?: string;
  description?: string;
  state?: string;
  draft?: boolean;
  author?: BitbucketAccount;
  source?: BitbucketPullRequestEndpoint;
  destination?: BitbucketPullRequestEndpoint;
  reviewers?: BitbucketAccount[];
  participants?: BitbucketParticipant[];
  merge_commit?: { hash?: string } | null;
  closed_by?: BitbucketAccount | null;
  close_source_branch?: boolean;
  comment_count?: number;
  task_count?: number;
  reason?: string;
  created_on?: string;
  updated_on?: string;
  links?: BitbucketLinks;
}

export interface BitbucketComment {
  id: number;
  content?: { raw?: string };
  user?: BitbucketAccount;
  inline?: { path?: string; from?: number | null; to?: number | null };
  parent?: { id?: number };
  deleted?: boolean;
  created_on?: string;
  updated_on?: string;
  links?: BitbucketLinks;
}

export interface BitbucketCommitStatus {
  key?: string;
  state?: string;
  name?: string;
  url?: string;
  description?: string;
  refname?: string | null;
  created_on?: string;
  updated_on?: string;
}

export interface BitbucketPipeline {
  uuid: string;
  build_number?: number;
  state?: {
    name?: string;
    result?: { name?: string };
    stage?: { name?: string };
  };
  target?: {
    type?: string;
    ref_type?: string;
    ref_name?: string;
    commit?: { hash?: string };
    selector?: { type?: string; pattern?: string };
  };
  trigger?: { name?: string };
  creator?: BitbucketAccount;
  created_on?: string;
  completed_on?: string;
  build_seconds_used?: number;
}

export interface BitbucketRepository {
  slug: string;
  name?: string;
  full_name?: string;
  description?: string;
  is_private?: boolean;
  language?: string;
  mainbranch?: { name?: string };
  project?: { key?: string; name?: string };
  created_on?: string;
  updated_on?: string;
  links?: BitbucketLinks;
}

export interface BitbucketPaginated<T> {
  values?: T[];
  page?: number;
  pagelen?: number;
  size?: number;
  next?: string;
}
