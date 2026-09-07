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
// Action input schemas & inferred types
// =============================================================================

export const GetMeInputSchema = lazySchema(() => z.object({}));
export type GetMeInput = z.infer<typeof GetMeInputSchema>;

export const ListToolsInputSchema = lazySchema(() => z.object({}));
export type ListToolsInput = z.infer<typeof ListToolsInputSchema>;

export const SearchCodeInputSchema = lazySchema(() =>
  z.object({
    query: z.string().min(1).max(2000).describe('GitHub code search query'),
    page: z.number().optional().default(1).describe('Page number (1-based)'),
    perPage: z.number().optional().default(10).describe('Results per page (max 100)'),
  })
);
export type SearchCodeInput = z.infer<typeof SearchCodeInputSchema>;

export const SearchRepositoriesInputSchema = lazySchema(() =>
  z.object({
    query: z.string().min(1).max(2000).describe('GitHub repository search query'),
    page: z.number().optional().default(1).describe('Page number (1-based)'),
    perPage: z.number().optional().default(10).describe('Results per page (max 100)'),
  })
);
export type SearchRepositoriesInput = z.infer<typeof SearchRepositoriesInputSchema>;

export const SearchIssuesInputSchema = lazySchema(() =>
  z.object({
    query: z.string().min(1).max(2000).describe('GitHub issue search query'),
    order: z.enum(['asc', 'desc']).optional().default('desc'),
    sort: z.string().max(50).optional().default('created'),
    page: z.number().optional().default(1).describe('Page number (1-based)'),
    perPage: z.number().optional().default(10).describe('Results per page (max 100)'),
  })
);
export type SearchIssuesInput = z.infer<typeof SearchIssuesInputSchema>;

export const SearchPullRequestsInputSchema = lazySchema(() =>
  z.object({
    query: z.string().min(1).max(2000).describe('GitHub pull request search query'),
    order: z.enum(['asc', 'desc']).optional().default('desc'),
    sort: z.string().max(50).optional().default('created'),
    page: z.number().optional().default(1).describe('Page number (1-based)'),
    perPage: z.number().optional().default(10).describe('Results per page (max 100)'),
  })
);
export type SearchPullRequestsInput = z.infer<typeof SearchPullRequestsInputSchema>;

export const SearchUsersInputSchema = lazySchema(() =>
  z.object({
    query: z.string().min(1).max(2000).describe('GitHub user search query'),
    page: z.number().optional().default(1).describe('Page number (1-based)'),
    perPage: z.number().optional().default(10).describe('Results per page (max 100)'),
  })
);
export type SearchUsersInput = z.infer<typeof SearchUsersInputSchema>;

export const ListIssuesInputSchema = lazySchema(() =>
  z.object({
    owner: z.string().min(1).max(200).describe('Repository owner (user or org)'),
    repo: z.string().min(1).max(200).describe('Repository name'),
    state: z.enum(['open', 'closed', 'all']).optional().default('open'),
    first: z.number().optional().default(10).describe('Number of results to return'),
    after: z
      .string()
      .max(2048)
      .optional()
      .describe('Cursor for pagination (endCursor from previous response)'),
  })
);
export type ListIssuesInput = z.infer<typeof ListIssuesInputSchema>;

export const ListPullRequestsInputSchema = lazySchema(() =>
  z.object({
    owner: z.string().min(1).max(200).describe('Repository owner (user or org)'),
    repo: z.string().min(1).max(200).describe('Repository name'),
    state: z.enum(['open', 'closed', 'all']).optional().default('open'),
    first: z.number().optional().default(10).describe('Number of results to return'),
    after: z
      .string()
      .max(2048)
      .optional()
      .describe('Cursor for pagination (endCursor from previous response)'),
  })
);
export type ListPullRequestsInput = z.infer<typeof ListPullRequestsInputSchema>;

export const ListCommitsInputSchema = lazySchema(() =>
  z.object({
    owner: z.string().min(1).max(200).describe('Repository owner (user or org)'),
    repo: z.string().min(1).max(200).describe('Repository name'),
    sha: z.string().max(200).optional().describe('Branch name or commit SHA to start listing from'),
    first: z.number().optional().default(10).describe('Number of results to return'),
    after: z
      .string()
      .max(2048)
      .optional()
      .describe('Cursor for pagination (endCursor from previous response)'),
  })
);
export type ListCommitsInput = z.infer<typeof ListCommitsInputSchema>;

export const ListBranchesInputSchema = lazySchema(() =>
  z.object({
    owner: z.string().min(1).max(200).describe('Repository owner (user or org)'),
    repo: z.string().min(1).max(200).describe('Repository name'),
    first: z.number().optional().default(10).describe('Number of results to return'),
    after: z
      .string()
      .max(2048)
      .optional()
      .describe('Cursor for pagination (endCursor from previous response)'),
  })
);
export type ListBranchesInput = z.infer<typeof ListBranchesInputSchema>;

export const ListReleasesInputSchema = lazySchema(() =>
  z.object({
    owner: z.string().min(1).max(200).describe('Repository owner (user or org)'),
    repo: z.string().min(1).max(200).describe('Repository name'),
    first: z.number().optional().default(10).describe('Number of results to return'),
    after: z
      .string()
      .max(2048)
      .optional()
      .describe('Cursor for pagination (endCursor from previous response)'),
  })
);
export type ListReleasesInput = z.infer<typeof ListReleasesInputSchema>;

export const ListTagsInputSchema = lazySchema(() =>
  z.object({
    owner: z.string().min(1).max(200).describe('Repository owner (user or org)'),
    repo: z.string().min(1).max(200).describe('Repository name'),
    first: z.number().optional().default(10).describe('Number of results to return'),
    after: z
      .string()
      .max(2048)
      .optional()
      .describe('Cursor for pagination (endCursor from previous response)'),
  })
);
export type ListTagsInput = z.infer<typeof ListTagsInputSchema>;

export const GetCommitInputSchema = lazySchema(() =>
  z.object({
    owner: z.string().min(1).max(200).describe('Repository owner (user or org)'),
    repo: z.string().min(1).max(200).describe('Repository name'),
    sha: z.string().min(1).max(200).describe('Commit SHA'),
  })
);
export type GetCommitInput = z.infer<typeof GetCommitInputSchema>;

export const GetLatestReleaseInputSchema = lazySchema(() =>
  z.object({
    owner: z.string().min(1).max(200).describe('Repository owner (user or org)'),
    repo: z.string().min(1).max(200).describe('Repository name'),
  })
);
export type GetLatestReleaseInput = z.infer<typeof GetLatestReleaseInputSchema>;

export const PullRequestReadInputSchema = lazySchema(() =>
  z.object({
    owner: z.string().min(1).max(200).describe('Repository owner (user or org)'),
    repo: z.string().min(1).max(200).describe('Repository name'),
    pullNumber: z.number().describe('Pull request number'),
    method: z
      .enum(['get', 'get_diff', 'get_review_comments'])
      .optional()
      .default('get')
      .describe('What to retrieve: full PR details, unified diff, or review comments'),
  })
);
export type PullRequestReadInput = z.infer<typeof PullRequestReadInputSchema>;

export const GetFileContentsInputSchema = lazySchema(() =>
  z.object({
    owner: z.string().min(1).max(200).describe('Repository owner (user or org)'),
    repo: z.string().min(1).max(200).describe('Repository name'),
    path: z.string().min(1).max(1024).describe('File or directory path within the repository'),
    ref: z
      .string()
      .max(200)
      .optional()
      .describe('Branch name, tag, or commit SHA (defaults to default branch)'),
  })
);
export type GetFileContentsInput = z.infer<typeof GetFileContentsInputSchema>;

export const GetIssueInputSchema = lazySchema(() =>
  z.object({
    owner: z.string().min(1).max(200).describe('Repository owner (user or org)'),
    repo: z.string().min(1).max(200).describe('Repository name'),
    issueNumber: z.number().describe('Issue number'),
  })
);
export type GetIssueInput = z.infer<typeof GetIssueInputSchema>;

export const GetIssueCommentsInputSchema = lazySchema(() =>
  z.object({
    owner: z.string().min(1).max(200).describe('Repository owner (user or org)'),
    repo: z.string().min(1).max(200).describe('Repository name'),
    issueNumber: z.number().describe('Issue number'),
  })
);
export type GetIssueCommentsInput = z.infer<typeof GetIssueCommentsInputSchema>;

export const CallToolInputSchema = lazySchema(() =>
  z.object({
    name: z.string().min(1).max(200).describe('Name of the MCP tool to call'),
    arguments: z
      .record(z.string().max(200), z.unknown())
      .refine((v) => Object.keys(v).length <= 50, {
        message: 'arguments must have at most 50 keys',
      })
      .optional()
      .describe('Arguments to pass to the tool (tool-specific)'),
  })
);
export type CallToolInput = z.infer<typeof CallToolInputSchema>;

// =============================================================================
// Write action input schemas & inferred types
// =============================================================================

export const CreateIssueInputSchema = lazySchema(() =>
  z.object({
    owner: z.string().min(1).max(200).describe('Repository owner (user or org)'),
    repo: z.string().min(1).max(200).describe('Repository name'),
    title: z.string().min(1).max(200).describe('Issue title'),
    body: z.string().max(65536).optional().describe('Issue body in Markdown'),
    assignees: z
      .array(z.string().max(200))
      .max(25)
      .optional()
      .describe('Logins of users to assign to this issue'),
    labels: z
      .array(z.string().max(200))
      .max(100)
      .optional()
      .describe('Label names to apply to this issue'),
    milestone: z.number().optional().describe('Milestone number to associate with this issue'),
  })
);
export type CreateIssueInput = z.infer<typeof CreateIssueInputSchema>;

export const AddIssueCommentInputSchema = lazySchema(() =>
  z.object({
    owner: z.string().min(1).max(200).describe('Repository owner (user or org)'),
    repo: z.string().min(1).max(200).describe('Repository name'),
    issueNumber: z.number().describe('Issue number'),
    body: z.string().min(1).max(65536).describe('Comment body in Markdown'),
  })
);
export type AddIssueCommentInput = z.infer<typeof AddIssueCommentInputSchema>;

export const UpdateIssueInputSchema = lazySchema(() =>
  z
    .object({
      owner: z.string().min(1).max(200).describe('Repository owner (user or org)'),
      repo: z.string().min(1).max(200).describe('Repository name'),
      issueNumber: z.number().describe('Issue number to update'),
      title: z.string().min(1).max(200).optional().describe('New issue title'),
      body: z.string().max(65536).optional().describe('New issue body in Markdown'),
      state: z.enum(['open', 'closed']).optional().describe('New issue state: "open" or "closed"'),
      assignees: z
        .array(z.string().max(200))
        .max(25)
        .optional()
        .describe('Logins to assign (replaces all existing assignees)'),
      labels: z
        .array(z.string().max(200))
        .max(100)
        .optional()
        .describe('Labels to set (replaces all existing labels)'),
      milestone: z
        .number()
        .nullable()
        .optional()
        .describe('Milestone number to set, or null to clear the milestone'),
    })
    .refine(
      (v) =>
        v.title !== undefined ||
        v.body !== undefined ||
        v.state !== undefined ||
        v.assignees !== undefined ||
        v.labels !== undefined ||
        v.milestone !== undefined,
      {
        message:
          'At least one of title, body, state, assignees, labels, or milestone must be provided',
      }
    )
);
export type UpdateIssueInput = z.infer<typeof UpdateIssueInputSchema>;

export const CreatePullRequestInputSchema = lazySchema(() =>
  z.object({
    owner: z.string().min(1).max(200).describe('Repository owner (user or org)'),
    repo: z.string().min(1).max(200).describe('Repository name'),
    title: z.string().min(1).max(200).describe('Pull request title'),
    head: z
      .string()
      .min(1)
      .max(200)
      .describe(
        'Branch containing the changes (e.g. "feature/my-branch"). For cross-repo PRs use "user:branch".'
      ),
    base: z.string().min(1).max(200).describe('Branch to merge into (e.g. "main")'),
    body: z.string().max(65536).optional().describe('Pull request description in Markdown'),
    draft: z.boolean().optional().describe('If true, create as a draft pull request'),
    maintainerCanModify: z
      .boolean()
      .optional()
      .describe('If true, maintainers can push to the head branch'),
  })
);
export type CreatePullRequestInput = z.infer<typeof CreatePullRequestInputSchema>;

export const MergePullRequestInputSchema = lazySchema(() =>
  z.object({
    owner: z.string().min(1).max(200).describe('Repository owner (user or org)'),
    repo: z.string().min(1).max(200).describe('Repository name'),
    pullNumber: z.number().describe('Pull request number'),
    commitTitle: z
      .string()
      .max(200)
      .optional()
      .describe('Title for the merge commit (not used with the rebase method)'),
    commitMessage: z
      .string()
      .max(2000)
      .optional()
      .describe('Extra detail appended to the automatic commit message'),
    mergeMethod: z
      .enum(['merge', 'squash', 'rebase'])
      .optional()
      .default('merge')
      .describe('Merge strategy: "merge" (merge commit), "squash", or "rebase"'),
  })
);
export type MergePullRequestInput = z.infer<typeof MergePullRequestInputSchema>;

export const AddLabelsInputSchema = lazySchema(() =>
  z.object({
    owner: z.string().min(1).max(200).describe('Repository owner (user or org)'),
    repo: z.string().min(1).max(200).describe('Repository name'),
    issueNumber: z.number().describe('Issue or pull request number'),
    labels: z
      .array(z.string().max(200))
      .min(1)
      .max(100)
      .describe('Label names to add to the issue or pull request'),
  })
);
export type AddLabelsInput = z.infer<typeof AddLabelsInputSchema>;

export const AddAssigneeInputSchema = lazySchema(() =>
  z.object({
    owner: z.string().min(1).max(200).describe('Repository owner (user or org)'),
    repo: z.string().min(1).max(200).describe('Repository name'),
    issueNumber: z.number().describe('Issue or pull request number'),
    assignees: z
      .array(z.string().max(200))
      .min(1)
      .max(25)
      .describe('Logins of users to add as assignees'),
  })
);
export type AddAssigneeInput = z.infer<typeof AddAssigneeInputSchema>;

export const CreateBranchInputSchema = lazySchema(() =>
  z.object({
    owner: z.string().min(1).max(200).describe('Repository owner (user or org)'),
    repo: z.string().min(1).max(200).describe('Repository name'),
    ref: z
      .string()
      .min(1)
      .max(200)
      .describe(
        'Full reference name, must start with "refs/heads/" (e.g. "refs/heads/feature/my-branch")'
      ),
    sha: z.string().min(1).max(200).describe('SHA of the commit the new branch should point to'),
  })
);
export type CreateBranchInput = z.infer<typeof CreateBranchInputSchema>;

export const CreateOrUpdateFileInputSchema = lazySchema(() =>
  z.object({
    owner: z.string().min(1).max(200).describe('Repository owner (user or org)'),
    repo: z.string().min(1).max(200).describe('Repository name'),
    path: z
      .string()
      .min(1)
      .max(1024)
      .refine((p) => p.split('/').every((s) => s && s !== '.' && s !== '..'), {
        message: 'path must not contain empty, ".", or ".." segments',
      })
      .describe('File path within the repository (e.g. "src/README.md")'),
    message: z.string().min(1).max(2000).describe('Commit message for this file change'),
    content: z
      .string()
      .min(1)
      .max(100000)
      .describe('New file contents, Base64-encoded (required by the GitHub API)'),
    sha: z
      .string()
      .max(200)
      .optional()
      .describe(
        'Blob SHA of the existing file being replaced. Required when updating an existing file; omit when creating a new file.'
      ),
    branch: z
      .string()
      .max(200)
      .optional()
      .describe('Branch to commit to (defaults to the repository default branch)'),
  })
);
export type CreateOrUpdateFileInput = z.infer<typeof CreateOrUpdateFileInputSchema>;

export const UpdatePullRequestInputSchema = lazySchema(() =>
  z
    .object({
      owner: z.string().min(1).max(200).describe('Repository owner (user or org)'),
      repo: z.string().min(1).max(200).describe('Repository name'),
      pullNumber: z.number().describe('Pull request number to update'),
      title: z.string().min(1).max(200).optional().describe('New title for the pull request'),
      body: z.string().max(65536).optional().describe('New description in Markdown'),
      state: z.enum(['open', 'closed']).optional().describe('New state: "open" or "closed"'),
      base: z
        .string()
        .max(200)
        .optional()
        .describe('New base branch name to change the merge target'),
      maintainerCanModify: z
        .boolean()
        .optional()
        .describe('If true, maintainers can push to the head branch'),
    })
    .refine(
      (v) =>
        v.title !== undefined ||
        v.body !== undefined ||
        v.state !== undefined ||
        v.base !== undefined ||
        v.maintainerCanModify !== undefined,
      {
        message:
          'At least one of title, body, state, base, or maintainerCanModify must be provided',
      }
    )
);
export type UpdatePullRequestInput = z.infer<typeof UpdatePullRequestInputSchema>;

export const RequestReviewersInputSchema = lazySchema(() =>
  z
    .object({
      owner: z.string().min(1).max(200).describe('Repository owner (user or org)'),
      repo: z.string().min(1).max(200).describe('Repository name'),
      pullNumber: z.number().describe('Pull request number'),
      reviewers: z
        .array(z.string().max(200))
        .max(25)
        .optional()
        .describe('Logins of individual users to request reviews from'),
      teamReviewers: z
        .array(z.string().max(200))
        .max(25)
        .optional()
        .describe('Team slugs to request reviews from (slug only, without the org prefix)'),
    })
    .refine(
      (v) =>
        (v.reviewers !== undefined && v.reviewers.length > 0) ||
        (v.teamReviewers !== undefined && v.teamReviewers.length > 0),
      { message: 'At least one of reviewers or teamReviewers must be provided and non-empty' }
    )
);
export type RequestReviewersInput = z.infer<typeof RequestReviewersInputSchema>;

export const TriggerWorkflowInputSchema = lazySchema(() =>
  z.object({
    owner: z.string().min(1).max(200).describe('Repository owner (user or org)'),
    repo: z.string().min(1).max(200).describe('Repository name'),
    workflowId: z
      .string()
      .min(1)
      .max(200)
      .describe('Workflow file name (e.g. "ci.yml") or numeric workflow ID'),
    ref: z.string().min(1).max(200).describe('Branch name or tag to run the workflow on'),
    inputs: z
      .record(z.string().max(200), z.string().max(2000))
      .refine((v) => Object.keys(v).length <= 25, {
        message: 'inputs must have at most 25 entries',
      })
      .optional()
      .describe(
        'Input key-value pairs to pass to the workflow (must match the inputs defined in workflow_dispatch)'
      ),
  })
);
export type TriggerWorkflowInput = z.infer<typeof TriggerWorkflowInputSchema>;
