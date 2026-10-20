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
    .max(20)
    .describe(
      'The issue IID as a string (project-internal number shown in the UI, e.g. "42"). Not the global issue ID.'
    );

const mrIidField = () =>
  z
    .string()
    .regex(/^\d+$/)
    .max(20)
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
    include: z
      .array(z.enum(['approvals', 'diffs']))
      .max(2)
      .optional()
      .describe(
        'Optional extra data to fetch in parallel: "approvals" (approval status and approvers), "diffs" (list of changed files, up to 100).'
      ),
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
      .describe(
        'Array of user IDs to assign to this merge request. Use searchUsers to find user IDs.'
      ),
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
    sha: z
      .string()
      .max(64)
      .optional()
      .describe(
        'HEAD SHA of the source branch at the time of review. When provided, GitLab rejects the merge if the branch has moved since, preventing accidental merges of unreviewed commits.'
      ),
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

// =============================================================================
// Additional schemas (actions added from v2 implementation)
// =============================================================================

const sortOrderField = () =>
  z.enum(['asc', 'desc']).optional().describe('Sort direction: "asc" or "desc" (default "desc").');

const pipelineIdField = () =>
  z
    .number()
    .int()
    .positive()
    .describe('Numeric pipeline ID (from listPipelines or triggerPipeline).');

const isoDateField = (what: string) =>
  z
    .string()
    .max(64)
    .optional()
    .describe(`${what} as an ISO 8601 timestamp, e.g. "2026-01-15T00:00:00Z".`);

export const ListGroupsInputSchema = lazySchema(() =>
  z.object({
    search: z.string().max(255).optional().describe('Filter groups by name or path.'),
    topLevelOnly: z
      .boolean()
      .optional()
      .describe('When true, only top-level groups (no subgroups).'),
    page: pageField(),
    perPage: perPageField(),
  })
);
export type ListGroupsInput = z.infer<typeof ListGroupsInputSchema>;

export const GetCommitInputSchema = lazySchema(() =>
  z.object({
    projectId: projectIdField(),
    sha: z
      .string()
      .min(1)
      .max(255)
      .describe('Commit SHA (full or abbreviated), branch name, or tag name.'),
    includeDiff: z
      .boolean()
      .optional()
      .describe(
        'When true (default), also returns per-file diffs for up to 100 changed files. Set false for metadata only.'
      ),
  })
);
export type GetCommitInput = z.infer<typeof GetCommitInputSchema>;

export const DeleteFileInputSchema = lazySchema(() =>
  z.object({
    projectId: projectIdField(),
    filePath: z
      .string()
      .min(1)
      .max(1024)
      .describe('Path to the file to delete. Example: "config/old.yaml".'),
    branch: z.string().min(1).max(200).describe('Branch to commit the deletion on.'),
    commitMessage: z.string().min(1).max(2000).describe('Commit message for the deletion.'),
    lastCommitId: z
      .string()
      .max(200)
      .optional()
      .describe(
        'SHA of the last known commit for this file. Provide to detect concurrent changes (from getFile).'
      ),
  })
);
export type DeleteFileInput = z.infer<typeof DeleteFileInputSchema>;

export const ListTagsInputSchema = lazySchema(() =>
  z.object({
    projectId: projectIdField(),
    search: z.string().max(255).optional().describe('Filter tags by name substring.'),
    orderBy: z
      .enum(['name', 'updated', 'version'])
      .optional()
      .describe('Order by "name", "updated" (default), or "version" (semantic version).'),
    sort: sortOrderField(),
    page: pageField(),
    perPage: perPageField(),
  })
);
export type ListTagsInput = z.infer<typeof ListTagsInputSchema>;

export const ListLabelsInputSchema = lazySchema(() =>
  z.object({
    projectId: projectIdField(),
    search: z.string().max(255).optional().describe('Filter labels by name or description.'),
    page: pageField(),
    perPage: perPageField(),
  })
);
export type ListLabelsInput = z.infer<typeof ListLabelsInputSchema>;

export const SearchCodeInputSchema = lazySchema(() =>
  z
    .object({
      search: z
        .string()
        .min(1)
        .max(500)
        .describe(
          'Search term. Supports GitLab code search syntax (filename:, path:, extension: filters).'
        ),
      projectId: projectIdField()
        .optional()
        .describe(
          'Restrict to one project (strongly recommended). Instance-wide code search requires Advanced Search (Premium/Ultimate) and returns 403 otherwise.'
        ),
      groupId: z
        .string()
        .max(500)
        .optional()
        .describe('Restrict to a group (numeric ID or full path). Also requires Advanced Search.'),
      ref: z
        .string()
        .max(200)
        .optional()
        .describe(
          'Branch or tag to search in. Only valid with projectId; omit for group or instance searches.'
        ),
      page: pageField(),
      perPage: perPageField(),
    })
    .refine((v) => !(v.projectId !== undefined && v.groupId !== undefined), {
      message: 'Provide projectId or groupId, not both.',
    })
    .refine((v) => !(v.ref !== undefined && v.projectId === undefined), {
      message: 'ref is only supported with projectId.',
    })
);
export type SearchCodeInput = z.infer<typeof SearchCodeInputSchema>;

export const ApproveMergeRequestInputSchema = lazySchema(() =>
  z.object({
    projectId: projectIdField(),
    mrIid: mrIidField(),
    sha: z
      .string()
      .max(64)
      .optional()
      .describe(
        'HEAD SHA of the source branch. When provided, approval fails if the branch has moved since review.'
      ),
  })
);
export type ApproveMergeRequestInput = z.infer<typeof ApproveMergeRequestInputSchema>;

export const GetPipelineInputSchema = lazySchema(() =>
  z.object({
    projectId: projectIdField(),
    pipelineId: pipelineIdField(),
  })
);
export type GetPipelineInput = z.infer<typeof GetPipelineInputSchema>;

export const PipelineActionInputSchema = lazySchema(() =>
  z.object({
    projectId: projectIdField(),
    pipelineId: pipelineIdField(),
  })
);
export type PipelineActionInput = z.infer<typeof PipelineActionInputSchema>;

export const ListJobsInputSchema = lazySchema(() =>
  z.object({
    projectId: projectIdField(),
    pipelineId: pipelineIdField(),
    scope: z
      .array(
        z.enum([
          'created',
          'pending',
          'running',
          'failed',
          'success',
          'canceling',
          'canceled',
          'skipped',
          'waiting_for_resource',
          'manual',
          'scheduled',
        ])
      )
      .max(11)
      .optional()
      .describe('Only jobs in these statuses, e.g. ["failed"].'),
    includeRetried: z
      .boolean()
      .optional()
      .describe('When true, include retried (superseded) jobs.'),
    page: pageField(),
    perPage: perPageField(),
  })
);
export type ListJobsInput = z.infer<typeof ListJobsInputSchema>;

export const GetJobArtifactInputSchema = lazySchema(() =>
  z.object({
    projectId: projectIdField(),
    jobId: z.number().int().positive().describe('Numeric job ID (from listJobs).'),
    artifactPath: z
      .string()
      .max(1024)
      .optional()
      .describe(
        'Path of a file inside the job artifacts archive, e.g. "gl-sast-report.json". Omit to return the job log (trace) instead.'
      ),
    maxLength: z
      .number()
      .int()
      .min(1)
      .max(200000)
      .optional()
      .describe(
        'Maximum characters to return (default 20000). Logs keep the end; artifacts keep the start.'
      ),
  })
);
export type GetJobArtifactInput = z.infer<typeof GetJobArtifactInputSchema>;

export const ListPipelineSchedulesInputSchema = lazySchema(() =>
  z.object({
    projectId: projectIdField(),
    scope: z
      .enum(['active', 'inactive'])
      .optional()
      .describe('Only "active" or "inactive" schedules.'),
    page: pageField(),
    perPage: perPageField(),
  })
);
export type ListPipelineSchedulesInput = z.infer<typeof ListPipelineSchedulesInputSchema>;

export const ListEnvironmentsInputSchema = lazySchema(() =>
  z.object({
    projectId: projectIdField(),
    search: z.string().max(255).optional().describe('Filter environments by name.'),
    states: z
      .enum(['available', 'stopping', 'stopped'])
      .optional()
      .describe('Only environments in this state.'),
    page: pageField(),
    perPage: perPageField(),
  })
);
export type ListEnvironmentsInput = z.infer<typeof ListEnvironmentsInputSchema>;

export const ListDeploymentsInputSchema = lazySchema(() =>
  z.object({
    projectId: projectIdField(),
    environment: z
      .string()
      .max(255)
      .optional()
      .describe('Only deployments to this environment name, e.g. "production".'),
    status: z
      .enum(['created', 'running', 'success', 'failed', 'canceled', 'blocked'])
      .optional()
      .describe('Only deployments with this status.'),
    updatedAfter: isoDateField('Only deployments updated on or after this time'),
    orderBy: z
      .enum(['id', 'iid', 'created_at', 'updated_at', 'finished_at'])
      .optional()
      .describe('Field to order by (default "id").'),
    sort: z
      .enum(['asc', 'desc'])
      .optional()
      .describe('Sort direction: "asc" or "desc" (default "asc").'),
    page: pageField(),
    perPage: perPageField(),
  })
);
export type ListDeploymentsInput = z.infer<typeof ListDeploymentsInputSchema>;

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
        'File content as plain text by default, or Base64-encoded when encoding is "base64".'
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
