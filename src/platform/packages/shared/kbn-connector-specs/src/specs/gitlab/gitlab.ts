/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * GitLab Connector
 *
 * Connects to the GitLab REST API v4 to search projects, manage issues and
 * merge requests, browse repository files, and trigger CI/CD pipelines.
 *
 * Auth: Bearer token (Personal Access Token or OAuth token)
 * Required scope: `api` (full access) or `read_api` (read-only actions only)
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import { UISchemas } from '../../connector_spec_ui';
import type { ConnectorSpec } from '../../connector_spec';
import {
  GetCurrentUserInputSchema,
  SearchProjectsInputSchema,
  GetProjectInputSchema,
  SearchUsersInputSchema,
  ListIssuesInputSchema,
  GetIssueInputSchema,
  ListMergeRequestsInputSchema,
  GetMergeRequestInputSchema,
  ListBranchesInputSchema,
  GetFileInputSchema,
  ListCommitsInputSchema,
  ListPipelinesInputSchema,
  CreateIssueInputSchema,
  AddIssueNoteInputSchema,
  CreateMergeRequestInputSchema,
  CreateBranchInputSchema,
  TriggerPipelineInputSchema,
  UpdateIssueInputSchema,
  UpdateMergeRequestInputSchema,
  AcceptMergeRequestInputSchema,
  AddMergeRequestNoteInputSchema,
  RequestMergeRequestReviewInputSchema,
  CreateOrUpdateFileInputSchema,
} from './types';
import type {
  SearchProjectsInput,
  GetProjectInput,
  SearchUsersInput,
  ListIssuesInput,
  GetIssueInput,
  ListMergeRequestsInput,
  GetMergeRequestInput,
  ListBranchesInput,
  GetFileInput,
  ListCommitsInput,
  ListPipelinesInput,
  CreateIssueInput,
  AddIssueNoteInput,
  CreateMergeRequestInput,
  CreateBranchInput,
  TriggerPipelineInput,
  UpdateIssueInput,
  UpdateMergeRequestInput,
  AcceptMergeRequestInput,
  AddMergeRequestNoteInput,
  RequestMergeRequestReviewInput,
  CreateOrUpdateFileInput,
} from './types';

const GITLAB_COM_API = 'https://gitlab.com/api/v4';

/** URL-encode a project ID or namespace/path for use in a URL path segment. */
const encodeProject = (projectId: string): string => encodeURIComponent(projectId);

export const Gitlab: ConnectorSpec = {
  metadata: {
    id: '.gitlab',
    displayName: 'GitLab',
    description: i18n.translate('core.kibanaConnectorSpecs.gitlab.metadata.description', {
      defaultMessage:
        'Search projects, manage issues and merge requests, browse repository files, and trigger CI/CD pipelines in GitLab.',
    }),
    minimumLicense: 'enterprise',
    // New connector: ship with agentBuilder only. Add 'workflows' in a follow-up PR
    // once this connector type reaches Production-NonCanary on all nodes.
    supportedFeatureIds: ['agentBuilder'],
  },

  auth: {
    types: [
      {
        type: 'bearer',
        defaults: {},
        overrides: {
          label: i18n.translate('core.kibanaConnectorSpecs.gitlab.auth.bearer.label', {
            defaultMessage: 'Personal Access Token',
          }),
        },
      },
    ],
  },

  schema: lazySchema(() =>
    z.object({
      apiUrl: UISchemas.url(GITLAB_COM_API)
        .default(GITLAB_COM_API)
        .describe(
          'GitLab API base URL. Use the default for GitLab.com, or your self-managed instance URL (e.g. https://gitlab.example.com/api/v4).'
        )
        .meta({
          label: i18n.translate('core.kibanaConnectorSpecs.gitlab.config.apiUrl.label', {
            defaultMessage: 'GitLab API URL',
          }),
          placeholder: GITLAB_COM_API,
          helpText: i18n.translate('core.kibanaConnectorSpecs.gitlab.config.apiUrl.helpText', {
            defaultMessage:
              'For GitLab.com leave the default. For a self-managed instance enter your API base URL, e.g. https://gitlab.example.com/api/v4.',
          }),
        }),
    })
  ),

  validateUrls: {
    fields: ['apiUrl'],
  },

  actions: {
    // =========================================================================
    // Read actions
    // =========================================================================

    getCurrentUser: {
      isTool: true,
      scope: 'read',
      description:
        'Get the profile of the currently authenticated GitLab user. Returns username, name, email, and user ID. Call this first to confirm authentication works and to resolve "me" to a real user ID.',
      input: GetCurrentUserInputSchema,
      handler: async (ctx) => {
        const apiUrl = ctx.config?.apiUrl as string;
        const response = await ctx.client.get(`${apiUrl}/user`);
        return response.data;
      },
    },

    searchProjects: {
      isTool: true,
      scope: 'read',
      description:
        'Search for GitLab projects (repositories) by name or keyword. Returns project IDs, names, namespace paths, and descriptions. Use the returned project ID or path (e.g. "elastic/kibana") in other actions.',
      input: SearchProjectsInputSchema,
      handler: async (ctx, input: SearchProjectsInput) => {
        const apiUrl = ctx.config?.apiUrl as string;
        const response = await ctx.client.get(`${apiUrl}/projects`, {
          params: {
            search: input.search,
            page: input.page,
            per_page: input.perPage,
            order_by: 'last_activity_at',
            sort: 'desc',
          },
        });
        return response.data;
      },
    },

    getProject: {
      isTool: true,
      scope: 'read',
      description:
        'Get full details for a single GitLab project by ID or namespace path. Returns the default branch, visibility, description, star count, and more. Use searchProjects to find the project ID or path first.',
      input: GetProjectInputSchema,
      handler: async (ctx, input: GetProjectInput) => {
        const apiUrl = ctx.config?.apiUrl as string;
        const response = await ctx.client.get(
          `${apiUrl}/projects/${encodeProject(input.projectId)}`
        );
        return response.data;
      },
    },

    searchUsers: {
      isTool: true,
      scope: 'read',
      description:
        'Search for GitLab users by username or name. Returns user IDs, usernames, and display names. Use the returned user ID when assigning issues or merge requests.',
      input: SearchUsersInputSchema,
      handler: async (ctx, input: SearchUsersInput) => {
        const apiUrl = ctx.config?.apiUrl as string;
        const response = await ctx.client.get(`${apiUrl}/users`, {
          params: {
            search: input.search,
            page: input.page,
            per_page: input.perPage,
          },
        });
        return response.data;
      },
    },

    listIssues: {
      isTool: true,
      scope: 'read',
      description:
        'List issues in a GitLab project. Returns issue IIDs, titles, labels, assignees, state, and creation dates. Supports filtering by state, label, assignee, or keyword. Use the returned issueIid in getIssue, updateIssue, or addIssueNote.',
      input: ListIssuesInputSchema,
      handler: async (ctx, input: ListIssuesInput) => {
        const apiUrl = ctx.config?.apiUrl as string;
        const params: Record<string, unknown> = {
          state: input.state,
          page: input.page,
          per_page: input.perPage,
        };
        if (input.labels !== undefined) params.labels = input.labels;
        if (input.assigneeUsername !== undefined) params.assignee_username = input.assigneeUsername;
        if (input.search !== undefined) params.search = input.search;
        const response = await ctx.client.get(
          `${apiUrl}/projects/${encodeProject(input.projectId)}/issues`,
          { params }
        );
        return response.data;
      },
    },

    getIssue: {
      isTool: true,
      scope: 'read',
      description:
        'Get full details for a single issue in a GitLab project by its IID. Returns the title, description, state, labels, assignees, comments count, and milestone. Use the issueIid returned by listIssues.',
      input: GetIssueInputSchema,
      handler: async (ctx, input: GetIssueInput) => {
        const apiUrl = ctx.config?.apiUrl as string;
        const response = await ctx.client.get(
          `${apiUrl}/projects/${encodeProject(input.projectId)}/issues/${input.issueIid}`
        );
        return response.data;
      },
    },

    listMergeRequests: {
      isTool: true,
      scope: 'read',
      description:
        'List merge requests in a GitLab project. Returns MR IIDs, titles, source/target branches, state, and author info. Supports filtering by state, branch, or keyword. Use the returned mrIid in getMergeRequest, updateMergeRequest, or acceptMergeRequest.',
      input: ListMergeRequestsInputSchema,
      handler: async (ctx, input: ListMergeRequestsInput) => {
        const apiUrl = ctx.config?.apiUrl as string;
        const params: Record<string, unknown> = {
          state: input.state,
          page: input.page,
          per_page: input.perPage,
        };
        if (input.sourceBranch !== undefined) params.source_branch = input.sourceBranch;
        if (input.targetBranch !== undefined) params.target_branch = input.targetBranch;
        if (input.search !== undefined) params.search = input.search;
        const response = await ctx.client.get(
          `${apiUrl}/projects/${encodeProject(input.projectId)}/merge_requests`,
          { params }
        );
        return response.data;
      },
    },

    getMergeRequest: {
      isTool: true,
      scope: 'read',
      description:
        'Get full details for a single merge request by its IID. Returns the title, description, source/target branches, diff stats, labels, assignees, and pipeline status. Use the mrIid returned by listMergeRequests.',
      input: GetMergeRequestInputSchema,
      handler: async (ctx, input: GetMergeRequestInput) => {
        const apiUrl = ctx.config?.apiUrl as string;
        const response = await ctx.client.get(
          `${apiUrl}/projects/${encodeProject(input.projectId)}/merge_requests/${input.mrIid}`
        );
        return response.data;
      },
    },

    listBranches: {
      isTool: true,
      scope: 'read',
      description:
        'List repository branches in a GitLab project. Returns branch names, the HEAD commit SHA, and whether each branch is protected. Supports filtering by name substring.',
      input: ListBranchesInputSchema,
      handler: async (ctx, input: ListBranchesInput) => {
        const apiUrl = ctx.config?.apiUrl as string;
        const params: Record<string, unknown> = {
          page: input.page,
          per_page: input.perPage,
        };
        if (input.search !== undefined) params.search = input.search;
        const response = await ctx.client.get(
          `${apiUrl}/projects/${encodeProject(input.projectId)}/repository/branches`,
          { params }
        );
        return response.data;
      },
    },

    getFile: {
      isTool: true,
      scope: 'read',
      description:
        'Get the contents of a file from a GitLab repository. Returns the file content (base64-encoded), size, and last commit info. Decode the "content" field from base64 to get the raw text. For very large files this may produce a large payload.',
      input: GetFileInputSchema,
      handler: async (ctx, input: GetFileInput) => {
        const apiUrl = ctx.config?.apiUrl as string;
        const params: Record<string, unknown> = {};
        if (input.ref !== undefined) params.ref = input.ref;
        const response = await ctx.client.get(
          `${apiUrl}/projects/${encodeProject(
            input.projectId
          )}/repository/files/${encodeURIComponent(input.filePath)}`,
          { params }
        );
        return response.data;
      },
    },

    listCommits: {
      isTool: true,
      scope: 'read',
      description:
        'List commits in a GitLab repository. Returns commit SHAs, author names, commit messages, and timestamps. Optionally filter by branch, tag, or date range.',
      input: ListCommitsInputSchema,
      handler: async (ctx, input: ListCommitsInput) => {
        const apiUrl = ctx.config?.apiUrl as string;
        const params: Record<string, unknown> = {
          page: input.page,
          per_page: input.perPage,
        };
        if (input.refName !== undefined) params.ref_name = input.refName;
        if (input.since !== undefined) params.since = input.since;
        if (input.until !== undefined) params.until = input.until;
        const response = await ctx.client.get(
          `${apiUrl}/projects/${encodeProject(input.projectId)}/repository/commits`,
          { params }
        );
        return response.data;
      },
    },

    listPipelines: {
      isTool: true,
      scope: 'read',
      description:
        'List CI/CD pipelines in a GitLab project. Returns pipeline IDs, status, branch/tag, commit SHA, and timestamps. Supports filtering by branch/tag name or pipeline status.',
      input: ListPipelinesInputSchema,
      handler: async (ctx, input: ListPipelinesInput) => {
        const apiUrl = ctx.config?.apiUrl as string;
        const params: Record<string, unknown> = {
          page: input.page,
          per_page: input.perPage,
        };
        if (input.ref !== undefined) params.ref = input.ref;
        if (input.status !== undefined) params.status = input.status;
        const response = await ctx.client.get(
          `${apiUrl}/projects/${encodeProject(input.projectId)}/pipelines`,
          { params }
        );
        return response.data;
      },
    },

    // =========================================================================
    // Write actions (creates new data without modifying existing)
    // =========================================================================

    createIssue: {
      isTool: true,
      scope: 'write',
      description:
        'Create a new issue in a GitLab project. Returns the created issue including its IID, web URL, and state. Use searchUsers to find user IDs for assigneeIds.',
      input: CreateIssueInputSchema,
      handler: async (ctx, input: CreateIssueInput) => {
        const apiUrl = ctx.config?.apiUrl as string;
        const body: Record<string, unknown> = { title: input.title };
        if (input.description !== undefined) body.description = input.description;
        if (input.labels !== undefined) body.labels = input.labels;
        if (input.assigneeIds !== undefined) body.assignee_ids = input.assigneeIds;
        if (input.milestoneId !== undefined) body.milestone_id = input.milestoneId;
        if (input.dueDate !== undefined) body.due_date = input.dueDate;
        const response = await ctx.client.post(
          `${apiUrl}/projects/${encodeProject(input.projectId)}/issues`,
          body
        );
        return response.data;
      },
    },

    addIssueNote: {
      isTool: true,
      scope: 'write',
      description:
        'Add a comment (note) to an existing issue. Returns the created note including its ID, body, and author. Use getIssue to confirm the issue exists and find its IID first.',
      input: AddIssueNoteInputSchema,
      handler: async (ctx, input: AddIssueNoteInput) => {
        const apiUrl = ctx.config?.apiUrl as string;
        const response = await ctx.client.post(
          `${apiUrl}/projects/${encodeProject(input.projectId)}/issues/${input.issueIid}/notes`,
          { body: input.body }
        );
        return response.data;
      },
    },

    createMergeRequest: {
      isTool: true,
      scope: 'write',
      description:
        'Create a new merge request in a GitLab project. The source branch must already exist with commits not in the target branch. Returns the created MR including its IID and web URL.',
      input: CreateMergeRequestInputSchema,
      handler: async (ctx, input: CreateMergeRequestInput) => {
        const apiUrl = ctx.config?.apiUrl as string;
        const body: Record<string, unknown> = {
          source_branch: input.sourceBranch,
          target_branch: input.targetBranch,
          title: input.title,
        };
        if (input.description !== undefined) body.description = input.description;
        if (input.assigneeIds !== undefined) body.assignee_ids = input.assigneeIds;
        if (input.labels !== undefined) body.labels = input.labels;
        if (input.removeSourceBranch !== undefined)
          body.remove_source_branch = input.removeSourceBranch;
        if (input.squash !== undefined) body.squash = input.squash;
        const response = await ctx.client.post(
          `${apiUrl}/projects/${encodeProject(input.projectId)}/merge_requests`,
          body
        );
        return response.data;
      },
    },

    createBranch: {
      isTool: true,
      scope: 'write',
      description:
        'Create a new branch in a GitLab repository. Returns the created branch name and HEAD commit SHA. Use listBranches or listCommits to find a valid ref to branch from.',
      input: CreateBranchInputSchema,
      handler: async (ctx, input: CreateBranchInput) => {
        const apiUrl = ctx.config?.apiUrl as string;
        const response = await ctx.client.post(
          `${apiUrl}/projects/${encodeProject(input.projectId)}/repository/branches`,
          { branch: input.branch, ref: input.ref }
        );
        return response.data;
      },
    },

    triggerPipeline: {
      isTool: true,
      scope: 'write',
      description:
        'Trigger a new CI/CD pipeline in a GitLab project on the specified branch or tag. Returns the created pipeline ID and status. Optionally pass pipeline variables.',
      input: TriggerPipelineInputSchema,
      handler: async (ctx, input: TriggerPipelineInput) => {
        const apiUrl = ctx.config?.apiUrl as string;
        const body: Record<string, unknown> = { ref: input.ref };
        if (input.variables !== undefined) {
          body.variables = input.variables.map((v) => ({
            key: v.key,
            value: v.value,
            ...(v.variableType !== undefined && { variable_type: v.variableType }),
          }));
        }
        const response = await ctx.client.post(
          `${apiUrl}/projects/${encodeProject(input.projectId)}/pipeline`,
          body
        );
        return response.data;
      },
    },

    // =========================================================================
    // Destroy actions (modify or delete existing data)
    // =========================================================================

    updateIssue: {
      isTool: true,
      scope: 'destroy',
      description:
        'Update an existing issue (title, description, state, labels, assignees, milestone, or due date). At least one field must be provided. To close an issue set stateEvent to "close".',
      input: UpdateIssueInputSchema,
      handler: async (ctx, input: UpdateIssueInput) => {
        const apiUrl = ctx.config?.apiUrl as string;
        const body: Record<string, unknown> = {};
        if (input.title !== undefined) body.title = input.title;
        if (input.description !== undefined) body.description = input.description;
        if (input.stateEvent !== undefined) body.state_event = input.stateEvent;
        if (input.labels !== undefined) body.labels = input.labels;
        if (input.assigneeIds !== undefined) body.assignee_ids = input.assigneeIds;
        if (input.milestoneId !== undefined) body.milestone_id = input.milestoneId;
        if (input.dueDate !== undefined) body.due_date = input.dueDate;
        const response = await ctx.client.put(
          `${apiUrl}/projects/${encodeProject(input.projectId)}/issues/${input.issueIid}`,
          body
        );
        return response.data;
      },
    },

    updateMergeRequest: {
      isTool: true,
      scope: 'destroy',
      description:
        'Update an existing merge request (title, description, state, target branch, labels, assignees, or squash/remove-source-branch settings). At least one field must be provided. To close an MR set stateEvent to "close".',
      input: UpdateMergeRequestInputSchema,
      handler: async (ctx, input: UpdateMergeRequestInput) => {
        const apiUrl = ctx.config?.apiUrl as string;
        const body: Record<string, unknown> = {};
        if (input.title !== undefined) body.title = input.title;
        if (input.description !== undefined) body.description = input.description;
        if (input.stateEvent !== undefined) body.state_event = input.stateEvent;
        if (input.targetBranch !== undefined) body.target_branch = input.targetBranch;
        if (input.labels !== undefined) body.labels = input.labels;
        if (input.assigneeIds !== undefined) body.assignee_ids = input.assigneeIds;
        if (input.removeSourceBranch !== undefined)
          body.remove_source_branch = input.removeSourceBranch;
        if (input.squash !== undefined) body.squash = input.squash;
        const response = await ctx.client.put(
          `${apiUrl}/projects/${encodeProject(input.projectId)}/merge_requests/${input.mrIid}`,
          body
        );
        return response.data;
      },
    },

    acceptMergeRequest: {
      isTool: true,
      scope: 'destroy',
      description:
        'Merge an open merge request. The MR must be in a mergeable state (no conflicts, all required approvals given). Returns the merged MR including the merge commit SHA. Fails if the MR is not mergeable.',
      input: AcceptMergeRequestInputSchema,
      handler: async (ctx, input: AcceptMergeRequestInput) => {
        const apiUrl = ctx.config?.apiUrl as string;
        const body: Record<string, unknown> = {};
        if (input.mergeCommitMessage !== undefined)
          body.merge_commit_message = input.mergeCommitMessage;
        if (input.squash !== undefined) body.squash = input.squash;
        if (input.shouldRemoveSourceBranch !== undefined)
          body.should_remove_source_branch = input.shouldRemoveSourceBranch;
        const response = await ctx.client.put(
          `${apiUrl}/projects/${encodeProject(input.projectId)}/merge_requests/${
            input.mrIid
          }/merge`,
          body
        );
        return response.data;
      },
    },

    addMergeRequestNote: {
      isTool: true,
      scope: 'write',
      description:
        'Add a comment (note) to an existing merge request. Returns the created note including its ID, body, and author. Use getMergeRequest to confirm the MR exists and find its IID first.',
      input: AddMergeRequestNoteInputSchema,
      handler: async (ctx, input: AddMergeRequestNoteInput) => {
        const apiUrl = ctx.config?.apiUrl as string;
        const response = await ctx.client.post(
          `${apiUrl}/projects/${encodeProject(input.projectId)}/merge_requests/${
            input.mrIid
          }/notes`,
          { body: input.body }
        );
        return response.data;
      },
    },

    requestMergeRequestReview: {
      isTool: true,
      scope: 'write',
      description:
        'Set the reviewers on a merge request. Replaces all existing reviewers. Use searchUsers to find user IDs. Returns the updated merge request.',
      input: RequestMergeRequestReviewInputSchema,
      handler: async (ctx, input: RequestMergeRequestReviewInput) => {
        const apiUrl = ctx.config?.apiUrl as string;
        const response = await ctx.client.put(
          `${apiUrl}/projects/${encodeProject(input.projectId)}/merge_requests/${input.mrIid}`,
          { reviewer_ids: input.reviewerIds }
        );
        return response.data;
      },
    },

    createOrUpdateFile: {
      isTool: true,
      scope: 'destroy',
      description:
        'Create or update a single file in a GitLab repository. Pass lastCommitId (from getFile) when updating an existing file to detect conflicts. Omit lastCommitId when creating a new file. Returns the file path and commit SHA.',
      input: CreateOrUpdateFileInputSchema,
      handler: async (ctx, input: CreateOrUpdateFileInput) => {
        const apiUrl = ctx.config?.apiUrl as string;
        const encodedPath = encodeURIComponent(input.filePath);
        const url = `${apiUrl}/projects/${encodeProject(
          input.projectId
        )}/repository/files/${encodedPath}`;
        const body: Record<string, unknown> = {
          branch: input.branch,
          content: input.content,
          commit_message: input.commitMessage,
          encoding: input.encoding ?? 'text',
        };
        if (input.lastCommitId !== undefined) body.last_commit_id = input.lastCommitId;
        const response =
          input.lastCommitId !== undefined
            ? await ctx.client.put(url, body)
            : await ctx.client.post(url, body);
        return response.data;
      },
    },
  },

  test: {
    enabled: true,
    description: i18n.translate('core.kibanaConnectorSpecs.gitlab.test.description', {
      defaultMessage: 'Verifies connectivity by fetching the current authenticated user profile.',
    }),
    handler: async (ctx) => {
      const apiUrl = ctx.config?.apiUrl as string;
      const response = await ctx.client.get(`${apiUrl}/user`);
      const { username, name } = response.data as { username?: string; name?: string };
      return { username, name };
    },
  },

  skill: [
    '## GitLab Connector',
    '',
    'Use this connector to interact with GitLab projects, issues, merge requests, repository files, and CI/CD pipelines.',
    '',
    '### Key concepts',
    '- A "project" is GitLab\'s term for a repository. Identify a project by its numeric ID or namespace path (e.g. "elastic/kibana").',
    '- Issues and merge requests use an "IID" (internal ID within the project), which is the number shown in the GitLab UI (e.g. #42). This is distinct from the global database ID.',
    '- GitLab calls PR comments "notes" — use addIssueNote to comment on an issue.',
    '',
    '### Action strategy',
    "- Start with getCurrentUser to confirm authentication and resolve the current user's ID.",
    '- To find a project: use searchProjects with a keyword, then use the returned ID or path in other actions.',
    '- To find users for assignment: use searchUsers to resolve a username to a numeric user ID.',
    '- Issue workflow: listIssues → getIssue (details) → updateIssue (close/edit) / addIssueNote (comment).',
    '- MR workflow: listMergeRequests → getMergeRequest (details) → updateMergeRequest (edit) / acceptMergeRequest (merge).',
    '- File reading: use getFile with the file path (e.g. "src/index.ts") and the desired ref (branch or commit SHA).',
    '- CI/CD: use listPipelines to check recent pipeline status; use triggerPipeline to start a new run.',
    '',
    '### Common gotchas',
    '- Pagination: all list actions return up to perPage results (default 20, max 100). Pass page=2 and beyond to get more results.',
    '- For updateIssue and updateMergeRequest, the labels field REPLACES all existing labels — include all desired labels, not just the ones to add.',
    '- acceptMergeRequest fails with 405 if the MR has merge conflicts or pending required approvals — check getMergeRequest first.',
    '- Self-managed GitLab instances require the apiUrl connector config to point to their own API, e.g. https://gitlab.example.com/api/v4.',
  ].join('\n'),
};
