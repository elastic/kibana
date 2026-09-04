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

const projectId = () =>
  z
    .string()
    .min(1)
    .max(500)
    .describe(
      'The project: either its numeric ID (e.g. "86037262") or its URL-encoded-safe full path "namespace/project" (e.g. "my-group/my-repo"). Use listProjects to discover it.'
    );

const iid = (what: string) =>
  z
    .number()
    .int()
    .positive()
    .describe(
      `The ${what} IID (the per-project number shown in the GitLab UI and URL, e.g. 42), NOT the global id.`
    );

const numericId = (what: string) =>
  z.number().int().positive().describe(`The global numeric ID of the ${what}.`);

const ref = () =>
  z
    .string()
    .min(1)
    .max(255)
    .describe('A git ref: branch name, tag name, or commit SHA, e.g. "main".');

const labels = (verb: string) =>
  z
    .array(z.string().min(1).max(255))
    .max(50)
    .optional()
    .describe(`Label names to ${verb} (max 50), e.g. ["security", "remediation"].`);

const userIds = (what: string) =>
  z
    .array(z.number().int().positive())
    .max(50)
    .optional()
    .describe(
      `Numeric user IDs to set as ${what} (max 50). Find IDs with listUsers. Pass an empty array to unassign everyone.`
    );

const page = () =>
  z.number().int().min(1).optional().describe('Page number for pagination (min 1, default 1).');

const perPage = () =>
  z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe('Results per page (min 1, max 100, default 20).');

const sortOrder = () =>
  z.enum(['asc', 'desc']).optional().describe('Sort direction: "asc" or "desc" (default "desc").');

const isoDate = (what: string) =>
  z
    .string()
    .max(64)
    .optional()
    .describe(`${what}, as an ISO 8601 timestamp, e.g. "2026-01-15T00:00:00Z".`);

// =============================================================================
// Projects, users, groups
// =============================================================================

export const ListProjectsInputSchema = lazySchema(() =>
  z.object({
    search: z
      .string()
      .max(500)
      .optional()
      .describe('Filter projects whose name or path contains this text, e.g. "payments".'),
    membership: z
      .boolean()
      .optional()
      .describe(
        'When true, only projects the authenticated user is a member of. Defaults to true, because listing all visible projects on GitLab.com returns millions of public projects.'
      ),
    owned: z
      .boolean()
      .optional()
      .describe('When true, only projects owned by the authenticated user.'),
    visibility: z
      .enum(['public', 'internal', 'private'])
      .optional()
      .describe('Filter by visibility: "public", "internal", or "private".'),
    orderBy: z
      .enum(['id', 'name', 'path', 'created_at', 'updated_at', 'last_activity_at', 'star_count'])
      .optional()
      .describe('Field to order by (default "created_at").'),
    sort: sortOrder(),
    page: page(),
    perPage: perPage(),
  })
);
export type ListProjectsInput = z.infer<typeof ListProjectsInputSchema>;

export const GetProjectInputSchema = lazySchema(() => z.object({ projectId: projectId() }));
export type GetProjectInput = z.infer<typeof GetProjectInputSchema>;

export const ListUsersInputSchema = lazySchema(() =>
  z.object({
    search: z
      .string()
      .max(255)
      .optional()
      .describe('Search users by name, username, or public email, e.g. "jane".'),
    username: z
      .string()
      .max(255)
      .optional()
      .describe('Exact username to look up, e.g. "jdoe". Returns at most one user.'),
    active: z.boolean().optional().describe('When true, only active (non-blocked) users.'),
    page: page(),
    perPage: perPage(),
  })
);
export type ListUsersInput = z.infer<typeof ListUsersInputSchema>;

export const ListGroupsInputSchema = lazySchema(() =>
  z.object({
    search: z
      .string()
      .max(255)
      .optional()
      .describe('Filter groups whose name or path contains this text.'),
    topLevelOnly: z
      .boolean()
      .optional()
      .describe('When true, only top-level groups (no subgroups).'),
    page: page(),
    perPage: perPage(),
  })
);
export type ListGroupsInput = z.infer<typeof ListGroupsInputSchema>;

// =============================================================================
// Issues
// =============================================================================

export const ListIssuesInputSchema = lazySchema(() =>
  z.object({
    projectId: projectId(),
    state: z
      .enum(['opened', 'closed', 'all'])
      .optional()
      .describe('Filter by state: "opened", "closed", or "all" (default "all").'),
    labels: labels('require on each issue (all must match)'),
    search: z
      .string()
      .max(500)
      .optional()
      .describe('Full-text search in issue title and description.'),
    assigneeUsername: z
      .string()
      .max(255)
      .optional()
      .describe('Only issues assigned to this username.'),
    authorUsername: z
      .string()
      .max(255)
      .optional()
      .describe('Only issues created by this username.'),
    createdAfter: isoDate('Only issues created on or after this time'),
    updatedAfter: isoDate('Only issues updated on or after this time'),
    orderBy: z
      .enum(['created_at', 'updated_at', 'priority', 'due_date', 'label_priority', 'title'])
      .optional()
      .describe('Field to order by (default "created_at").'),
    sort: sortOrder(),
    page: page(),
    perPage: perPage(),
  })
);
export type ListIssuesInput = z.infer<typeof ListIssuesInputSchema>;

export const GetIssueInputSchema = lazySchema(() =>
  z.object({ projectId: projectId(), issueIid: iid('issue') })
);
export type GetIssueInput = z.infer<typeof GetIssueInputSchema>;

export const CreateIssueInputSchema = lazySchema(() =>
  z.object({
    projectId: projectId(),
    title: z.string().min(1).max(255).describe('Issue title.'),
    description: z
      .string()
      .max(1048576)
      .optional()
      .describe('Issue description in GitLab Flavored Markdown.'),
    labels: labels('apply'),
    assigneeIds: userIds('assignees'),
    confidential: z.boolean().optional().describe('When true, the issue is confidential.'),
    issueType: z
      .enum(['issue', 'incident', 'test_case', 'task'])
      .optional()
      .describe('Issue type: "issue" (default), "incident", "test_case", or "task".'),
    dueDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')
      .optional()
      .describe('Due date as YYYY-MM-DD.'),
  })
);
export type CreateIssueInput = z.infer<typeof CreateIssueInputSchema>;

export const UpdateIssueInputSchema = lazySchema(() =>
  z
    .object({
      projectId: projectId(),
      issueIid: iid('issue'),
      title: z.string().min(1).max(255).optional().describe('New title.'),
      description: z
        .string()
        .max(1048576)
        .optional()
        .describe('New description in GitLab Flavored Markdown (replaces the existing one).'),
      stateEvent: z
        .enum(['close', 'reopen'])
        .optional()
        .describe('Set to "close" to close the issue or "reopen" to reopen it.'),
      labels: labels('replace the full label set with'),
      addLabels: labels('add, keeping existing labels'),
      removeLabels: labels('remove'),
      assigneeIds: userIds('assignees (replaces the current assignees)'),
      confidential: z.boolean().optional().describe('Set the confidential flag.'),
      dueDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')
        .optional()
        .describe('New due date as YYYY-MM-DD.'),
    })
    .refine(
      (value) =>
        [
          value.title,
          value.description,
          value.stateEvent,
          value.labels,
          value.addLabels,
          value.removeLabels,
          value.assigneeIds,
          value.confidential,
          value.dueDate,
        ].some((field) => field !== undefined),
      { message: 'At least one field to update must be provided.' }
    )
);
export type UpdateIssueInput = z.infer<typeof UpdateIssueInputSchema>;

export const CreateIssueNoteInputSchema = lazySchema(() =>
  z.object({
    projectId: projectId(),
    issueIid: iid('issue'),
    body: z.string().min(1).max(1000000).describe('Comment text in GitLab Flavored Markdown.'),
    internal: z
      .boolean()
      .optional()
      .describe(
        'When true, the note is internal (visible only to project members with Reporter role or higher).'
      ),
  })
);
export type CreateIssueNoteInput = z.infer<typeof CreateIssueNoteInputSchema>;

// =============================================================================
// Merge requests
// =============================================================================

export const ListMergeRequestsInputSchema = lazySchema(() =>
  z.object({
    projectId: projectId(),
    state: z
      .enum(['opened', 'closed', 'locked', 'merged', 'all'])
      .optional()
      .describe(
        'Filter by state: "opened", "closed", "locked", "merged", or "all" (default "all").'
      ),
    sourceBranch: z
      .string()
      .max(255)
      .optional()
      .describe('Only merge requests from this source branch.'),
    targetBranch: z
      .string()
      .max(255)
      .optional()
      .describe('Only merge requests into this target branch.'),
    labels: labels('require on each merge request (all must match)'),
    search: z
      .string()
      .max(500)
      .optional()
      .describe('Full-text search in merge request title and description.'),
    authorUsername: z
      .string()
      .max(255)
      .optional()
      .describe('Only merge requests created by this username.'),
    orderBy: z
      .enum(['created_at', 'updated_at', 'title'])
      .optional()
      .describe('Field to order by (default "created_at").'),
    sort: sortOrder(),
    page: page(),
    perPage: perPage(),
  })
);
export type ListMergeRequestsInput = z.infer<typeof ListMergeRequestsInputSchema>;

export const GetMergeRequestInputSchema = lazySchema(() =>
  z.object({
    projectId: projectId(),
    mergeRequestIid: iid('merge request'),
    includeDiffSummary: z
      .boolean()
      .optional()
      .describe(
        'When true (default), also returns the approval state and the first 100 changed files (paths and change type, without diff text) with a changedFilesTruncated flag.'
      ),
  })
);
export type GetMergeRequestInput = z.infer<typeof GetMergeRequestInputSchema>;

export const CreateMergeRequestInputSchema = lazySchema(() =>
  z.object({
    projectId: projectId(),
    title: z
      .string()
      .min(1)
      .max(255)
      .describe('Merge request title. Prefix with "Draft: " to open it as a draft.'),
    sourceBranch: z
      .string()
      .min(1)
      .max(255)
      .describe('The branch containing the changes, e.g. "fix/config-drift".'),
    targetBranch: z.string().min(1).max(255).describe('The branch to merge into, e.g. "main".'),
    description: z
      .string()
      .max(1048576)
      .optional()
      .describe('Description in GitLab Flavored Markdown.'),
    labels: labels('apply'),
    assigneeIds: userIds('assignees'),
    reviewerIds: userIds('reviewers'),
    removeSourceBranch: z
      .boolean()
      .optional()
      .describe('When true, the source branch is deleted after the merge request is merged.'),
    squash: z.boolean().optional().describe('When true, commits are squashed into one on merge.'),
  })
);
export type CreateMergeRequestInput = z.infer<typeof CreateMergeRequestInputSchema>;

export const UpdateMergeRequestInputSchema = lazySchema(() =>
  z
    .object({
      projectId: projectId(),
      mergeRequestIid: iid('merge request'),
      title: z.string().min(1).max(255).optional().describe('New title.'),
      description: z
        .string()
        .max(1048576)
        .optional()
        .describe('New description in GitLab Flavored Markdown (replaces the existing one).'),
      targetBranch: z.string().min(1).max(255).optional().describe('New target branch.'),
      stateEvent: z
        .enum(['close', 'reopen'])
        .optional()
        .describe('Set to "close" to close the merge request without merging, or "reopen".'),
      labels: labels('replace the full label set with'),
      addLabels: labels('add, keeping existing labels'),
      removeLabels: labels('remove'),
      assigneeIds: userIds('assignees (replaces the current assignees)'),
      reviewerIds: userIds('reviewers (replaces the current reviewers)'),
      removeSourceBranch: z
        .boolean()
        .optional()
        .describe('Set whether the source branch is deleted on merge.'),
      squash: z.boolean().optional().describe('Set whether commits are squashed on merge.'),
    })
    .refine(
      (value) =>
        [
          value.title,
          value.description,
          value.targetBranch,
          value.stateEvent,
          value.labels,
          value.addLabels,
          value.removeLabels,
          value.assigneeIds,
          value.reviewerIds,
          value.removeSourceBranch,
          value.squash,
        ].some((field) => field !== undefined),
      { message: 'At least one field to update must be provided.' }
    )
);
export type UpdateMergeRequestInput = z.infer<typeof UpdateMergeRequestInputSchema>;

export const ApproveMergeRequestInputSchema = lazySchema(() =>
  z.object({
    projectId: projectId(),
    mergeRequestIid: iid('merge request'),
    sha: z
      .string()
      .regex(/^[0-9a-fA-F]{7,64}$/)
      .optional()
      .describe(
        'Optional HEAD SHA of the source branch. When provided, the approval fails if the branch has moved, which guards against approving unreviewed commits.'
      ),
  })
);
export type ApproveMergeRequestInput = z.infer<typeof ApproveMergeRequestInputSchema>;

export const AcceptMergeRequestInputSchema = lazySchema(() =>
  z.object({
    projectId: projectId(),
    mergeRequestIid: iid('merge request'),
    mergeCommitMessage: z.string().max(10000).optional().describe('Custom merge commit message.'),
    squash: z.boolean().optional().describe('When true, squash commits into one on merge.'),
    squashCommitMessage: z.string().max(10000).optional().describe('Custom squash commit message.'),
    shouldRemoveSourceBranch: z
      .boolean()
      .optional()
      .describe('When true, delete the source branch after merging.'),
    autoMerge: z
      .boolean()
      .optional()
      .describe(
        'When true, instead of merging immediately, set the merge request to merge automatically once its pipeline succeeds.'
      ),
    sha: z
      .string()
      .regex(/^[0-9a-fA-F]{7,64}$/)
      .optional()
      .describe('Optional HEAD SHA of the source branch; the merge fails if the branch has moved.'),
  })
);
export type AcceptMergeRequestInput = z.infer<typeof AcceptMergeRequestInputSchema>;

export const CreateMergeRequestNoteInputSchema = lazySchema(() =>
  z.object({
    projectId: projectId(),
    mergeRequestIid: iid('merge request'),
    body: z.string().min(1).max(1000000).describe('Comment text in GitLab Flavored Markdown.'),
    internal: z
      .boolean()
      .optional()
      .describe('When true, the note is internal (project members only).'),
  })
);
export type CreateMergeRequestNoteInput = z.infer<typeof CreateMergeRequestNoteInputSchema>;

// =============================================================================
// Repository: branches, commits, files, tags, search
// =============================================================================

export const ListBranchesInputSchema = lazySchema(() =>
  z.object({
    projectId: projectId(),
    search: z
      .string()
      .max(255)
      .optional()
      .describe(
        'Filter branches whose name contains this text. Prefix with "^" for starts-with or suffix "$" for ends-with.'
      ),
    page: page(),
    perPage: perPage(),
  })
);
export type ListBranchesInput = z.infer<typeof ListBranchesInputSchema>;

export const CreateBranchInputSchema = lazySchema(() =>
  z.object({
    projectId: projectId(),
    branch: z
      .string()
      .min(1)
      .max(255)
      .describe('Name of the branch to create, e.g. "fix/config-drift".'),
    ref: ref().describe(
      'The branch name or commit SHA to create the new branch from, e.g. "main".'
    ),
  })
);
export type CreateBranchInput = z.infer<typeof CreateBranchInputSchema>;

export const ListCommitsInputSchema = lazySchema(() =>
  z.object({
    projectId: projectId(),
    refName: ref()
      .optional()
      .describe('Branch, tag, or commit SHA to list history from. Defaults to the default branch.'),
    path: z
      .string()
      .max(1024)
      .optional()
      .describe('Only commits touching this file or directory path, e.g. "config/app.yml".'),
    since: isoDate('Only commits on or after this time'),
    until: isoDate('Only commits on or before this time'),
    author: z
      .string()
      .max(255)
      .optional()
      .describe('Only commits whose author name or email matches.'),
    page: page(),
    perPage: perPage(),
  })
);
export type ListCommitsInput = z.infer<typeof ListCommitsInputSchema>;

export const GetCommitInputSchema = lazySchema(() =>
  z.object({
    projectId: projectId(),
    sha: z
      .string()
      .min(1)
      .max(255)
      .describe('Commit SHA (full or abbreviated), or a branch or tag name to resolve to its tip.'),
    includeDiff: z
      .boolean()
      .optional()
      .describe(
        'When true (default), also returns the per-file diff for the first 100 changed files (diffsTruncated flags more). Each file diff is truncated to 4000 characters; set false to skip diffs for large commits.'
      ),
  })
);
export type GetCommitInput = z.infer<typeof GetCommitInputSchema>;

export const GetFileInputSchema = lazySchema(() =>
  z.object({
    projectId: projectId(),
    filePath: z
      .string()
      .min(1)
      .max(1024)
      .describe('Path of the file in the repository, e.g. "k8s/deployment.yaml".'),
    ref: ref().describe('Branch, tag, or commit SHA to read the file from, e.g. "main".'),
  })
);
export type GetFileInput = z.infer<typeof GetFileInputSchema>;

const fileCommitFields = {
  projectId: projectId(),
  filePath: z
    .string()
    .min(1)
    .max(1024)
    .describe('Path of the file in the repository, e.g. "k8s/deployment.yaml".'),
  branch: z.string().min(1).max(255).describe('Branch to commit to, e.g. "fix/config-drift".'),
  commitMessage: z.string().min(1).max(10000).describe('Commit message.'),
  authorName: z.string().max(255).optional().describe('Optional commit author name.'),
  authorEmail: z.string().max(255).optional().describe('Optional commit author email.'),
};

export const CreateFileInputSchema = lazySchema(() =>
  z.object({
    ...fileCommitFields,
    content: z.string().max(5242880).describe('File content as plain text (UTF-8), max 5 MB.'),
    startBranch: z
      .string()
      .max(255)
      .optional()
      .describe('When set, creates `branch` from this existing branch first, then commits to it.'),
  })
);
export type CreateFileInput = z.infer<typeof CreateFileInputSchema>;

export const UpdateFileInputSchema = lazySchema(() =>
  z.object({
    ...fileCommitFields,
    content: z
      .string()
      .max(5242880)
      .describe(
        'The full new file content as plain text (UTF-8), max 5 MB. Replaces the existing content.'
      ),
    lastCommitId: z
      .string()
      .regex(/^[0-9a-fA-F]{7,64}$/)
      .optional()
      .describe(
        'Optional last known commit SHA of the file (from getFile). The update fails if the file changed since, preventing lost updates.'
      ),
    startBranch: z
      .string()
      .max(255)
      .optional()
      .describe('When set, creates `branch` from this existing branch first, then commits to it.'),
  })
);
export type UpdateFileInput = z.infer<typeof UpdateFileInputSchema>;

export const DeleteFileInputSchema = lazySchema(() =>
  z.object({
    ...fileCommitFields,
    lastCommitId: z
      .string()
      .regex(/^[0-9a-fA-F]{7,64}$/)
      .optional()
      .describe(
        'Optional last known commit SHA of the file; the delete fails if the file changed since.'
      ),
  })
);
export type DeleteFileInput = z.infer<typeof DeleteFileInputSchema>;

export const ListTagsInputSchema = lazySchema(() =>
  z.object({
    projectId: projectId(),
    search: z.string().max(255).optional().describe('Filter tags whose name contains this text.'),
    orderBy: z
      .enum(['name', 'updated', 'version'])
      .optional()
      .describe('Order by "name", "updated" (default), or "version" (semantic version order).'),
    sort: sortOrder(),
    page: page(),
    perPage: perPage(),
  })
);
export type ListTagsInput = z.infer<typeof ListTagsInputSchema>;

export const ListLabelsInputSchema = lazySchema(() =>
  z.object({
    projectId: projectId(),
    search: z
      .string()
      .max(255)
      .optional()
      .describe('Filter labels whose name or description contains this text.'),
    page: page(),
    perPage: perPage(),
  })
);
export type ListLabelsInput = z.infer<typeof ListLabelsInputSchema>;

export const SearchCodeInputSchema = lazySchema(() =>
  z.object({
    search: z
      .string()
      .min(1)
      .max(500)
      .describe(
        'Search term, e.g. "AKIA" or "password =". Supports the GitLab code search syntax (filename:, path:, extension: filters).'
      ),
    projectId: projectId()
      .optional()
      .describe(
        'Restrict the search to one project (numeric ID or "namespace/project"). Strongly recommended: instance-wide code search requires GitLab Advanced Search (Premium/Ultimate) and is rejected with 403 on other tiers.'
      ),
    groupId: z
      .string()
      .max(500)
      .optional()
      .describe(
        'Restrict the search to a group (numeric ID or full path). Group-wide code search also requires Advanced Search.'
      ),
    ref: z
      .string()
      .max(255)
      .optional()
      .describe('Branch or tag to search in (project scope only). Defaults to the default branch.'),
    page: page(),
    perPage: perPage(),
  })
);
export type SearchCodeInput = z.infer<typeof SearchCodeInputSchema>;

// =============================================================================
// CI/CD
// =============================================================================

export const ListPipelinesInputSchema = lazySchema(() =>
  z.object({
    projectId: projectId(),
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
      .describe('Filter by pipeline status.'),
    ref: z.string().max(255).optional().describe('Only pipelines for this branch or tag.'),
    sha: z.string().max(64).optional().describe('Only pipelines for this commit SHA.'),
    source: z
      .string()
      .max(64)
      .optional()
      .describe(
        'Only pipelines with this source, e.g. "push", "web", "api", "schedule", "merge_request_event".'
      ),
    username: z.string().max(255).optional().describe('Only pipelines triggered by this username.'),
    updatedAfter: isoDate('Only pipelines updated on or after this time'),
    orderBy: z
      .enum(['id', 'status', 'ref', 'updated_at', 'user_id'])
      .optional()
      .describe('Field to order by (default "id").'),
    sort: sortOrder(),
    page: page(),
    perPage: perPage(),
  })
);
export type ListPipelinesInput = z.infer<typeof ListPipelinesInputSchema>;

export const GetPipelineInputSchema = lazySchema(() =>
  z.object({
    projectId: projectId(),
    pipelineId: numericId('pipeline (returned by triggerPipeline or listPipelines)'),
  })
);
export type GetPipelineInput = z.infer<typeof GetPipelineInputSchema>;

export const TriggerPipelineInputSchema = lazySchema(() =>
  z.object({
    projectId: projectId(),
    ref: ref().describe('Branch or tag to run the pipeline for, e.g. "main".'),
    variables: z
      .array(
        z.object({
          key: z.string().min(1).max(255).describe('Variable name, e.g. "DEPLOY_ENV".'),
          value: z.string().max(10000).describe('Variable value.'),
          variableType: z
            .enum(['env_var', 'file'])
            .optional()
            .describe(
              '"env_var" (default) exposes the value as an environment variable; "file" writes it to a temp file and exposes the path.'
            ),
        })
      )
      .max(50)
      .optional()
      .describe('CI/CD variables to pass to the pipeline (max 50).'),
  })
);
export type TriggerPipelineInput = z.infer<typeof TriggerPipelineInputSchema>;

export const PipelineActionInputSchema = lazySchema(() =>
  z.object({ projectId: projectId(), pipelineId: numericId('pipeline') })
);
export type PipelineActionInput = z.infer<typeof PipelineActionInputSchema>;

export const ListJobsInputSchema = lazySchema(() =>
  z.object({
    projectId: projectId(),
    pipelineId: numericId('pipeline'),
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
    page: page(),
    perPage: perPage(),
  })
);
export type ListJobsInput = z.infer<typeof ListJobsInputSchema>;

export const GetJobArtifactInputSchema = lazySchema(() =>
  z.object({
    projectId: projectId(),
    jobId: numericId('job (from listJobs)'),
    artifactPath: z
      .string()
      .max(1024)
      .optional()
      .describe(
        'Path of a file inside the job\'s artifacts archive, e.g. "gl-sast-report.json" or "reports/summary.txt". Omit to return the job log (trace) instead.'
      ),
    maxLength: z
      .number()
      .int()
      .min(1)
      .max(200000)
      .optional()
      .describe(
        'Maximum number of characters to return (default 20000). Longer content is truncated from the start for logs and from the end for artifacts.'
      ),
  })
);
export type GetJobArtifactInput = z.infer<typeof GetJobArtifactInputSchema>;

export const ListPipelineSchedulesInputSchema = lazySchema(() =>
  z.object({
    projectId: projectId(),
    scope: z
      .enum(['active', 'inactive'])
      .optional()
      .describe('Only "active" or "inactive" schedules.'),
    page: page(),
    perPage: perPage(),
  })
);
export type ListPipelineSchedulesInput = z.infer<typeof ListPipelineSchedulesInputSchema>;

export const ListEnvironmentsInputSchema = lazySchema(() =>
  z.object({
    projectId: projectId(),
    search: z
      .string()
      .max(255)
      .optional()
      .describe('Filter environments whose name contains this text.'),
    states: z
      .enum(['available', 'stopping', 'stopped'])
      .optional()
      .describe('Only environments in this state.'),
    page: page(),
    perPage: perPage(),
  })
);
export type ListEnvironmentsInput = z.infer<typeof ListEnvironmentsInputSchema>;

export const ListDeploymentsInputSchema = lazySchema(() =>
  z.object({
    projectId: projectId(),
    environment: z
      .string()
      .max(255)
      .optional()
      .describe('Only deployments to this environment name, e.g. "production".'),
    status: z
      .enum(['created', 'running', 'success', 'failed', 'canceled', 'skipped', 'blocked'])
      .optional()
      .describe('Only deployments with this status.'),
    updatedAfter: isoDate('Only deployments updated on or after this time'),
    orderBy: z
      .enum(['id', 'iid', 'created_at', 'updated_at', 'finished_at'])
      .optional()
      .describe('Field to order by (default "id").'),
    sort: sortOrder(),
    page: page(),
    perPage: perPage(),
  })
);
export type ListDeploymentsInput = z.infer<typeof ListDeploymentsInputSchema>;

// =============================================================================
// GitLab API response shapes (subset of fields the handlers read)
// =============================================================================

export interface GitLabUser {
  id: number;
  username?: string;
  name?: string;
  state?: string;
  web_url?: string;
}

export interface GitLabNamespace {
  id?: number;
  full_path?: string;
  kind?: string;
}

export interface GitLabProject {
  id: number;
  name?: string;
  path?: string;
  path_with_namespace?: string;
  description?: string | null;
  visibility?: string;
  default_branch?: string;
  web_url?: string;
  archived?: boolean;
  topics?: string[];
  namespace?: GitLabNamespace;
  created_at?: string;
  last_activity_at?: string;
}

export interface GitLabGroup {
  id: number;
  name?: string;
  path?: string;
  full_path?: string;
  visibility?: string;
  description?: string | null;
  web_url?: string;
  parent_id?: number | null;
}

export interface GitLabMilestone {
  id?: number;
  iid?: number;
  title?: string;
  state?: string;
}

export interface GitLabIssue {
  id: number;
  iid: number;
  project_id?: number;
  title?: string;
  description?: string | null;
  state?: string;
  labels?: string[];
  assignees?: GitLabUser[];
  author?: GitLabUser;
  milestone?: GitLabMilestone | null;
  confidential?: boolean;
  issue_type?: string;
  due_date?: string | null;
  user_notes_count?: number;
  web_url?: string;
  created_at?: string;
  updated_at?: string;
  closed_at?: string | null;
}

export interface GitLabNote {
  id: number;
  body?: string;
  author?: GitLabUser;
  system?: boolean;
  internal?: boolean;
  noteable_type?: string;
  noteable_iid?: number;
  created_at?: string;
  updated_at?: string;
}

export interface GitLabMergeRequest {
  id: number;
  iid: number;
  project_id?: number;
  title?: string;
  description?: string | null;
  state?: string;
  draft?: boolean;
  detailed_merge_status?: string;
  merge_status?: string;
  has_conflicts?: boolean;
  source_branch?: string;
  target_branch?: string;
  sha?: string;
  merge_commit_sha?: string | null;
  squash_commit_sha?: string | null;
  squash?: boolean;
  should_remove_source_branch?: boolean | null;
  force_remove_source_branch?: boolean | null;
  labels?: string[];
  author?: GitLabUser;
  assignees?: GitLabUser[];
  reviewers?: GitLabUser[];
  merged_by?: GitLabUser | null;
  merge_user?: GitLabUser | null;
  changes_count?: string;
  user_notes_count?: number;
  web_url?: string;
  head_pipeline?: { id?: number; status?: string; web_url?: string } | null;
  created_at?: string;
  updated_at?: string;
  merged_at?: string | null;
  closed_at?: string | null;
}

export interface GitLabApprovals {
  approved?: boolean;
  approvals_required?: number | null;
  approvals_left?: number | null;
  approved_by?: Array<{ user?: GitLabUser }>;
  user_has_approved?: boolean;
  user_can_approve?: boolean;
}

export interface GitLabDiff {
  old_path?: string;
  new_path?: string;
  new_file?: boolean;
  renamed_file?: boolean;
  deleted_file?: boolean;
  diff?: string;
}

export interface GitLabCommit {
  id: string;
  short_id?: string;
  title?: string;
  message?: string;
  author_name?: string;
  author_email?: string;
  authored_date?: string;
  committer_name?: string;
  committed_date?: string;
  created_at?: string;
  parent_ids?: string[];
  web_url?: string;
  stats?: { additions?: number; deletions?: number; total?: number };
}

export interface GitLabBranch {
  name: string;
  default?: boolean;
  protected?: boolean;
  merged?: boolean;
  web_url?: string;
  commit?: GitLabCommit;
}

export interface GitLabTag {
  name: string;
  message?: string | null;
  target?: string;
  protected?: boolean;
  commit?: GitLabCommit;
  release?: { tag_name?: string; description?: string } | null;
}

export interface GitLabLabel {
  id: number;
  name?: string;
  color?: string;
  text_color?: string;
  description?: string | null;
}

export interface GitLabRepositoryFile {
  file_name?: string;
  file_path?: string;
  size?: number;
  encoding?: string;
  content?: string;
  content_sha256?: string;
  ref?: string;
  blob_id?: string;
  commit_id?: string;
  last_commit_id?: string;
}

export interface GitLabFileCommitResult {
  file_path?: string;
  branch?: string;
}

export interface GitLabSearchBlob {
  basename?: string;
  data?: string;
  path?: string;
  filename?: string;
  id?: string | null;
  ref?: string;
  startline?: number;
  project_id?: number;
}

export interface GitLabPipeline {
  id: number;
  iid?: number;
  project_id?: number;
  status?: string;
  source?: string;
  ref?: string;
  sha?: string;
  web_url?: string;
  user?: GitLabUser;
  created_at?: string;
  updated_at?: string;
  started_at?: string | null;
  finished_at?: string | null;
  duration?: number | null;
  queued_duration?: number | null;
  yaml_errors?: string | null;
}

export interface GitLabJob {
  id: number;
  name?: string;
  stage?: string;
  status?: string;
  ref?: string;
  allow_failure?: boolean;
  failure_reason?: string;
  created_at?: string;
  started_at?: string | null;
  finished_at?: string | null;
  duration?: number | null;
  web_url?: string;
  pipeline?: { id?: number; status?: string };
  artifacts?: Array<{ file_type?: string; filename?: string; size?: number }>;
}

export interface GitLabPipelineSchedule {
  id: number;
  description?: string;
  ref?: string;
  cron?: string;
  cron_timezone?: string;
  next_run_at?: string;
  active?: boolean;
  owner?: GitLabUser;
}

export interface GitLabEnvironment {
  id: number;
  name?: string;
  slug?: string;
  state?: string;
  external_url?: string | null;
  tier?: string;
  last_deployment?: {
    id?: number;
    status?: string;
    ref?: string;
    sha?: string;
    created_at?: string;
  } | null;
}

export interface GitLabDeployment {
  id: number;
  iid?: number;
  ref?: string;
  sha?: string;
  status?: string;
  environment?: { id?: number; name?: string };
  deployable?: { id?: number; name?: string; status?: string; pipeline?: { id?: number } } | null;
  user?: GitLabUser;
  created_at?: string;
  updated_at?: string;
  finished_at?: string | null;
}
