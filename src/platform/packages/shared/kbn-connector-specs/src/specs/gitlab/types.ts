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
// Shared field helpers
// =============================================================================

const projectIdField = () =>
  z
    .string()
    .min(1)
    .max(512)
    .describe(
      'The project ID as a numeric string ("12345") or namespace path ("elastic/kibana"). Pass numbers as strings.'
    );

const issueIidField = () =>
  z
    .string()
    .regex(/^\d+$/)
    .describe(
      'The issue IID as a string (project-internal number shown in the UI, e.g. "42"). Not the global issue ID.'
    );

const mrIidField = () =>
  z
    .string()
    .regex(/^\d+$/)
    .describe(
      'The merge request IID as a string (project-internal number shown in the UI, e.g. "15"). Not the global MR ID.'
    );

const pageField = () =>
  z
    .number()
    .int()
    .min(1)
    .optional()
    .default(1)
    .describe('Page number for pagination (1-based, default 1).');

const perPageField = () =>
  z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(20)
    .describe('Results per page (1-100, default 20).');

// =============================================================================
// Read action schemas
// =============================================================================

export const GetCurrentUserInputSchema = lazySchema(() => z.object({}));
export type GetCurrentUserInput = z.infer<typeof GetCurrentUserInputSchema>;

export const SearchProjectsInputSchema = lazySchema(() =>
  z.object({
    search: z
      .string()
      .min(1)
      .max(500)
      .describe(
        'Keyword to search for across project names and descriptions. Example: "elastic kibana".'
      ),
    page: pageField(),
    perPage: perPageField(),
  })
);
export type SearchProjectsInput = z.infer<typeof SearchProjectsInputSchema>;

export const GetProjectInputSchema = lazySchema(() =>
  z.object({
    projectId: projectIdField(),
  })
);
export type GetProjectInput = z.infer<typeof GetProjectInputSchema>;

export const SearchUsersInputSchema = lazySchema(() =>
  z.object({
    search: z
      .string()
      .min(1)
      .max(500)
      .describe('Username or name fragment to search for. Example: "jsmith".'),
    page: pageField(),
    perPage: perPageField(),
  })
);
export type SearchUsersInput = z.infer<typeof SearchUsersInputSchema>;

export const ListIssuesInputSchema = lazySchema(() =>
  z.object({
    projectId: projectIdField(),
    state: z
      .enum(['opened', 'closed', 'all'])
      .optional()
      .default('opened')
      .describe('Filter issues by state: "opened", "closed", or "all" (default "opened").'),
    labels: z
      .string()
      .max(2000)
      .optional()
      .describe('Comma-separated list of label names to filter by. Example: "bug,priority::high".'),
    assigneeUsername: z
      .string()
      .max(200)
      .optional()
      .describe('Filter by assignee username. Example: "jsmith".'),
    search: z
      .string()
      .max(500)
      .optional()
      .describe('Keyword to search for within issue titles and descriptions.'),
    page: pageField(),
    perPage: perPageField(),
  })
);
export type ListIssuesInput = z.infer<typeof ListIssuesInputSchema>;

export const GetIssueInputSchema = lazySchema(() =>
  z.object({
    projectId: projectIdField(),
    issueIid: issueIidField(),
  })
);
export type GetIssueInput = z.infer<typeof GetIssueInputSchema>;

export const ListMergeRequestsInputSchema = lazySchema(() =>
  z.object({
    projectId: projectIdField(),
    state: z
      .enum(['opened', 'closed', 'merged', 'all'])
      .optional()
      .default('opened')
      .describe('Filter MRs by state: "opened", "closed", "merged", or "all" (default "opened").'),
    sourceBranch: z
      .string()
      .max(200)
      .optional()
      .describe('Filter by source branch name. Example: "feature/my-branch".'),
    targetBranch: z
      .string()
      .max(200)
      .optional()
      .describe('Filter by target branch name. Example: "main".'),
    search: z
      .string()
      .max(500)
      .optional()
      .describe('Keyword to search for within MR titles and descriptions.'),
    page: pageField(),
    perPage: perPageField(),
  })
);
export type ListMergeRequestsInput = z.infer<typeof ListMergeRequestsInputSchema>;

export const GetMergeRequestInputSchema = lazySchema(() =>
  z.object({
    projectId: projectIdField(),
    mrIid: mrIidField(),
  })
);
export type GetMergeRequestInput = z.infer<typeof GetMergeRequestInputSchema>;

export const ListBranchesInputSchema = lazySchema(() =>
  z.object({
    projectId: projectIdField(),
    search: z
      .string()
      .max(200)
      .optional()
      .describe('Filter branches by name (substring match). Example: "feature".'),
    page: pageField(),
    perPage: perPageField(),
  })
);
export type ListBranchesInput = z.infer<typeof ListBranchesInputSchema>;

export const GetFileInputSchema = lazySchema(() =>
  z.object({
    projectId: projectIdField(),
    filePath: z
      .string()
      .min(1)
      .max(1024)
      .describe(
        'Path to the file within the repository. Example: "src/README.md" or "package.json".'
      ),
    ref: z
      .string()
      .max(200)
      .optional()
      .describe(
        'Branch name, tag, or commit SHA to read from (defaults to the default branch). Example: "main".'
      ),
  })
);
export type GetFileInput = z.infer<typeof GetFileInputSchema>;

export const ListCommitsInputSchema = lazySchema(() =>
  z.object({
    projectId: projectIdField(),
    refName: z
      .string()
      .max(200)
      .optional()
      .describe(
        'Branch name, tag, or commit SHA to list from (defaults to the default branch). Example: "main".'
      ),
    since: z
      .string()
      .max(50)
      .optional()
      .describe(
        'ISO 8601 datetime — only commits after this date. Example: "2024-01-01T00:00:00Z".'
      ),
    until: z
      .string()
      .max(50)
      .optional()
      .describe(
        'ISO 8601 datetime — only commits before this date. Example: "2024-12-31T23:59:59Z".'
      ),
    page: pageField(),
    perPage: perPageField(),
  })
);
export type ListCommitsInput = z.infer<typeof ListCommitsInputSchema>;

export const ListPipelinesInputSchema = lazySchema(() =>
  z.object({
    projectId: projectIdField(),
    ref: z
      .string()
      .max(200)
      .optional()
      .describe('Filter pipelines by branch or tag name. Example: "main".'),
    status: z
      .enum([
        'created',
        'waiting_for_resource',
        'preparing',
        'pending',
        'running',
        'success',
        'failed',
        'canceled',
        'skipped',
        'manual',
        'scheduled',
      ])
      .optional()
      .describe('Filter pipelines by status.'),
    page: pageField(),
    perPage: perPageField(),
  })
);
export type ListPipelinesInput = z.infer<typeof ListPipelinesInputSchema>;

// =============================================================================
// Write action schemas
// =============================================================================

export const CreateIssueInputSchema = lazySchema(() =>
  z.object({
    projectId: projectIdField(),
    title: z.string().min(1).max(500).describe('Issue title.'),
    description: z.string().max(65536).optional().describe('Issue description in Markdown format.'),
    labels: z
      .string()
      .max(2000)
      .optional()
      .describe('Comma-separated list of label names to apply. Example: "bug,priority::high".'),
    assigneeIds: z
      .array(z.number().int().positive())
      .max(20)
      .optional()
      .describe('Array of user IDs to assign to this issue. Use searchUsers to find user IDs.'),
    milestoneId: z
      .number()
      .int()
      .positive()
      .optional()
      .describe('Milestone ID to associate with this issue.'),
    dueDate: z
      .string()
      .max(20)
      .optional()
      .describe('Due date in ISO 8601 date format. Example: "2024-12-31".'),
  })
);
export type CreateIssueInput = z.infer<typeof CreateIssueInputSchema>;

export const AddIssueNoteInputSchema = lazySchema(() =>
  z.object({
    projectId: projectIdField(),
    issueIid: issueIidField(),
    body: z.string().min(1).max(65536).describe('The comment body in Markdown format.'),
  })
);
export type AddIssueNoteInput = z.infer<typeof AddIssueNoteInputSchema>;

export const CreateMergeRequestInputSchema = lazySchema(() =>
  z.object({
    projectId: projectIdField(),
    sourceBranch: z
      .string()
      .min(1)
      .max(200)
      .describe('The branch containing the changes to merge. Example: "feature/my-branch".'),
    targetBranch: z.string().min(1).max(200).describe('The branch to merge into. Example: "main".'),
    title: z.string().min(1).max(500).describe('The merge request title.'),
    description: z
      .string()
      .max(65536)
      .optional()
      .describe('The merge request description in Markdown format.'),
    assigneeIds: z
      .array(z.number().int().positive())
      .max(20)
      .optional()
      .describe('Array of user IDs to assign as reviewers. Use searchUsers to find user IDs.'),
    labels: z
      .string()
      .max(2000)
      .optional()
      .describe('Comma-separated list of label names to apply. Example: "feature,needs-review".'),
    removeSourceBranch: z
      .boolean()
      .optional()
      .describe('If true, delete the source branch after the MR is merged.'),
    squash: z
      .boolean()
      .optional()
      .describe('If true, squash all commits into a single commit when merging.'),
  })
);
export type CreateMergeRequestInput = z.infer<typeof CreateMergeRequestInputSchema>;

export const CreateBranchInputSchema = lazySchema(() =>
  z.object({
    projectId: projectIdField(),
    branch: z
      .string()
      .min(1)
      .max(200)
      .describe('Name for the new branch. Example: "feature/my-new-feature".'),
    ref: z
      .string()
      .min(1)
      .max(200)
      .describe('Branch name, tag, or commit SHA to branch from. Example: "main" or "abc123".'),
  })
);
export type CreateBranchInput = z.infer<typeof CreateBranchInputSchema>;

export const TriggerPipelineInputSchema = lazySchema(() =>
  z.object({
    projectId: projectIdField(),
    ref: z
      .string()
      .min(1)
      .max(200)
      .describe('Branch name or tag to run the pipeline on. Example: "main".'),
    variables: z
      .array(
        z.object({
          key: z.string().min(1).max(200).describe('Variable name.'),
          value: z.string().max(2000).describe('Variable value.'),
          variableType: z
            .enum(['env_var', 'file'])
            .optional()
            .describe('Variable type: "env_var" (default) or "file".'),
        })
      )
      .max(50)
      .optional()
      .describe('Pipeline variables to pass to the triggered run.'),
  })
);
export type TriggerPipelineInput = z.infer<typeof TriggerPipelineInputSchema>;

// =============================================================================
// Destroy (update/delete) action schemas
// =============================================================================

export const UpdateIssueInputSchema = lazySchema(() =>
  z
    .object({
      projectId: projectIdField(),
      issueIid: issueIidField(),
      title: z.string().min(1).max(500).optional().describe('New issue title.'),
      description: z.string().max(65536).optional().describe('New issue description in Markdown.'),
      stateEvent: z
        .enum(['close', 'reopen'])
        .optional()
        .describe('Transition the issue state: "close" to close it, "reopen" to reopen it.'),
      labels: z
        .string()
        .max(2000)
        .optional()
        .describe(
          'Comma-separated list of labels to set (replaces all existing labels). Example: "bug,triaged".'
        ),
      assigneeIds: z
        .array(z.number().int().positive())
        .max(20)
        .optional()
        .describe(
          'Array of user IDs to set as assignees (replaces all existing assignees). Use an empty array to clear.'
        ),
      milestoneId: z
        .number()
        .int()
        .positive()
        .nullable()
        .optional()
        .describe('Milestone ID to set, or null to clear the milestone.'),
      dueDate: z
        .string()
        .max(20)
        .optional()
        .describe('New due date in ISO 8601 date format. Example: "2024-12-31".'),
    })
    .refine(
      (v) =>
        v.title !== undefined ||
        v.description !== undefined ||
        v.stateEvent !== undefined ||
        v.labels !== undefined ||
        v.assigneeIds !== undefined ||
        v.milestoneId !== undefined ||
        v.dueDate !== undefined,
      { message: 'At least one update field must be provided.' }
    )
);
export type UpdateIssueInput = z.infer<typeof UpdateIssueInputSchema>;

export const UpdateMergeRequestInputSchema = lazySchema(() =>
  z
    .object({
      projectId: projectIdField(),
      mrIid: mrIidField(),
      title: z.string().min(1).max(500).optional().describe('New MR title.'),
      description: z.string().max(65536).optional().describe('New MR description in Markdown.'),
      stateEvent: z
        .enum(['close', 'reopen'])
        .optional()
        .describe('Transition the MR state: "close" to close it, "reopen" to reopen it.'),
      targetBranch: z
        .string()
        .max(200)
        .optional()
        .describe('New target branch for the merge request.'),
      labels: z
        .string()
        .max(2000)
        .optional()
        .describe(
          'Comma-separated list of labels to set (replaces existing). Example: "needs-review".'
        ),
      assigneeIds: z
        .array(z.number().int().positive())
        .max(20)
        .optional()
        .describe(
          'Array of user IDs to set as assignees (replaces existing). Use an empty array to clear.'
        ),
      removeSourceBranch: z
        .boolean()
        .optional()
        .describe('If true, delete the source branch after the MR is merged.'),
      squash: z
        .boolean()
        .optional()
        .describe('If true, squash all commits into a single commit when merging.'),
    })
    .refine(
      (v) =>
        v.title !== undefined ||
        v.description !== undefined ||
        v.stateEvent !== undefined ||
        v.targetBranch !== undefined ||
        v.labels !== undefined ||
        v.assigneeIds !== undefined ||
        v.removeSourceBranch !== undefined ||
        v.squash !== undefined,
      { message: 'At least one update field must be provided.' }
    )
);
export type UpdateMergeRequestInput = z.infer<typeof UpdateMergeRequestInputSchema>;

export const AcceptMergeRequestInputSchema = lazySchema(() =>
  z.object({
    projectId: projectIdField(),
    mrIid: mrIidField(),
    mergeCommitMessage: z
      .string()
      .max(2000)
      .optional()
      .describe('Custom commit message for the merge commit.'),
    squash: z
      .boolean()
      .optional()
      .describe('If true, squash all MR commits into a single commit. Overrides the MR setting.'),
    shouldRemoveSourceBranch: z
      .boolean()
      .optional()
      .describe('If true, delete the source branch after merging.'),
  })
);
export type AcceptMergeRequestInput = z.infer<typeof AcceptMergeRequestInputSchema>;

export const AddMergeRequestNoteInputSchema = lazySchema(() =>
  z.object({
    projectId: projectIdField(),
    mrIid: mrIidField(),
    body: z.string().min(1).max(65536).describe('The comment body in Markdown format.'),
  })
);
export type AddMergeRequestNoteInput = z.infer<typeof AddMergeRequestNoteInputSchema>;

export const RequestMergeRequestReviewInputSchema = lazySchema(() =>
  z.object({
    projectId: projectIdField(),
    mrIid: mrIidField(),
    reviewerIds: z
      .array(z.number().int().positive())
      .min(1)
      .max(20)
      .describe(
        'Array of user IDs to set as reviewers (replaces existing reviewers). Use searchUsers to find user IDs.'
      ),
  })
);
export type RequestMergeRequestReviewInput = z.infer<typeof RequestMergeRequestReviewInputSchema>;

export const CreateOrUpdateFileInputSchema = lazySchema(() =>
  z.object({
    projectId: projectIdField(),
    filePath: z
      .string()
      .min(1)
      .max(1024)
      .describe('Path to the file within the repository. Example: "src/index.ts" or "README.md".'),
    branch: z
      .string()
      .min(1)
      .max(200)
      .describe('Branch to create or update the file on. Example: "main" or "feature/my-branch".'),
    content: z
      .string()
      .max(10485760)
      .describe(
        'File content, Base64-encoded. Use encoding: "base64" when passing binary or pre-encoded content.'
      ),
    commitMessage: z.string().min(1).max(2000).describe('Commit message for this file change.'),
    encoding: z
      .enum(['text', 'base64'])
      .optional()
      .default('text')
      .describe(
        'Content encoding: "text" for plain text (default) or "base64" for binary or pre-encoded content.'
      ),
    lastCommitId: z
      .string()
      .max(200)
      .optional()
      .describe(
        'SHA of the last commit that modified this file. Provide when updating an existing file to detect conflicts. Omit when creating a new file. Retrieve via getFile.'
      ),
  })
);
export type CreateOrUpdateFileInput = z.infer<typeof CreateOrUpdateFileInputSchema>;
