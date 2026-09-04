/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * GitLab Connector (v2)
 *
 * Drives GitLab projects, issues, merge requests, repository contents, and
 * CI/CD pipelines through the GitLab REST API v4
 * (https://docs.gitlab.com/api/rest/) on GitLab.com or a self-managed instance.
 *
 * Auth: PRIVATE-TOKEN header (personal, project, group, or instance access
 * token) or Authorization: Bearer with the same token.
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { AxiosError, AxiosResponse } from 'axios';
import { UISchemas, type ActionContext, type ConnectorSpec } from '../../connector_spec';
import type {
  AcceptMergeRequestInput,
  ApproveMergeRequestInput,
  CreateBranchInput,
  CreateFileInput,
  CreateIssueInput,
  CreateIssueNoteInput,
  CreateMergeRequestInput,
  CreateMergeRequestNoteInput,
  DeleteFileInput,
  GetCommitInput,
  GetFileInput,
  GetIssueInput,
  GetJobArtifactInput,
  GetMergeRequestInput,
  GetPipelineInput,
  GetProjectInput,
  GitLabApprovals,
  GitLabBranch,
  GitLabCommit,
  GitLabDeployment,
  GitLabDiff,
  GitLabEnvironment,
  GitLabFileCommitResult,
  GitLabGroup,
  GitLabIssue,
  GitLabJob,
  GitLabLabel,
  GitLabMergeRequest,
  GitLabNote,
  GitLabPipeline,
  GitLabPipelineSchedule,
  GitLabProject,
  GitLabRepositoryFile,
  GitLabSearchBlob,
  GitLabTag,
  GitLabUser,
  ListBranchesInput,
  ListCommitsInput,
  ListDeploymentsInput,
  ListEnvironmentsInput,
  ListGroupsInput,
  ListIssuesInput,
  ListJobsInput,
  ListLabelsInput,
  ListMergeRequestsInput,
  ListPipelineSchedulesInput,
  ListPipelinesInput,
  ListProjectsInput,
  ListTagsInput,
  ListUsersInput,
  PipelineActionInput,
  SearchCodeInput,
  TriggerPipelineInput,
  UpdateFileInput,
  UpdateIssueInput,
  UpdateMergeRequestInput,
} from './types';
import {
  AcceptMergeRequestInputSchema,
  ApproveMergeRequestInputSchema,
  CreateBranchInputSchema,
  CreateFileInputSchema,
  CreateIssueInputSchema,
  CreateIssueNoteInputSchema,
  CreateMergeRequestInputSchema,
  CreateMergeRequestNoteInputSchema,
  DeleteFileInputSchema,
  GetCommitInputSchema,
  GetFileInputSchema,
  GetIssueInputSchema,
  GetJobArtifactInputSchema,
  GetMergeRequestInputSchema,
  GetPipelineInputSchema,
  GetProjectInputSchema,
  ListBranchesInputSchema,
  ListCommitsInputSchema,
  ListDeploymentsInputSchema,
  ListEnvironmentsInputSchema,
  ListGroupsInputSchema,
  ListIssuesInputSchema,
  ListJobsInputSchema,
  ListLabelsInputSchema,
  ListMergeRequestsInputSchema,
  ListPipelineSchedulesInputSchema,
  ListPipelinesInputSchema,
  ListProjectsInputSchema,
  ListTagsInputSchema,
  ListUsersInputSchema,
  PipelineActionInputSchema,
  SearchCodeInputSchema,
  TriggerPipelineInputSchema,
  UpdateFileInputSchema,
  UpdateIssueInputSchema,
  UpdateMergeRequestInputSchema,
} from './types';

const GITLAB_DEFAULT_BASE_URL = 'https://gitlab.com';
const DIFF_TEXT_LIMIT = 4000;
const DIFF_FILE_LIMIT = 100;
const DEFAULT_ARTIFACT_LIMIT = 20000;

/** Normalizes the configured instance URL to `https://host[/prefix]/api/v4`. */
const buildApiUrl = (ctx: ActionContext): string => {
  const configured = (ctx.config?.baseUrl as string | undefined)?.trim();
  const baseUrl = (configured && configured.length > 0 ? configured : GITLAB_DEFAULT_BASE_URL)
    .replace(/\/+$/, '')
    .replace(/\/api\/v4$/, '');
  return `${baseUrl}/api/v4`;
};

/** GitLab accepts either the numeric id or the URL-encoded `namespace/project` path. */
const buildProjectUrl = (ctx: ActionContext, projectId: string): string =>
  `${buildApiUrl(ctx)}/projects/${encodeURIComponent(projectId.trim())}`;

const formatGitLabError = (action: string, error: unknown): Error => {
  const err = error as AxiosError<{
    message?: unknown;
    error?: unknown;
    error_description?: unknown;
  }>;
  const data = err.response?.data;
  const raw = data?.message ?? data?.error_description ?? data?.error;
  const detail =
    raw === undefined ? err.message : typeof raw === 'string' ? raw : JSON.stringify(raw);
  return new Error(
    `GitLab ${action} failed (status ${err.response?.status ?? 'unknown'}): ${detail}`
  );
};

const runAction = async <T>(action: string, fn: () => Promise<T>): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    throw formatGitLabError(action, error);
  }
};

// GitLab payloads carry avatar URLs, `_links`, and other UI noise, so every
// action trims its output to a curated camelCase shape.

const toUserSummary = (user?: GitLabUser | null) =>
  user
    ? {
        id: user.id,
        username: user.username,
        name: user.name,
        state: user.state,
        webUrl: user.web_url,
      }
    : undefined;

const toProjectSummary = (project: GitLabProject) => ({
  id: project.id,
  name: project.name,
  path: project.path,
  pathWithNamespace: project.path_with_namespace,
  namespace: project.namespace
    ? {
        id: project.namespace.id,
        fullPath: project.namespace.full_path,
        kind: project.namespace.kind,
      }
    : undefined,
  description: project.description ?? undefined,
  visibility: project.visibility,
  defaultBranch: project.default_branch,
  archived: project.archived,
  topics: project.topics,
  webUrl: project.web_url,
  createdAt: project.created_at,
  lastActivityAt: project.last_activity_at,
});

const toGroupSummary = (group: GitLabGroup) => ({
  id: group.id,
  name: group.name,
  path: group.path,
  fullPath: group.full_path,
  visibility: group.visibility,
  description: group.description ?? undefined,
  parentId: group.parent_id ?? undefined,
  webUrl: group.web_url,
});

const toIssueSummary = (issue: GitLabIssue) => ({
  id: issue.id,
  iid: issue.iid,
  projectId: issue.project_id,
  title: issue.title,
  description: issue.description ?? undefined,
  state: issue.state,
  issueType: issue.issue_type,
  confidential: issue.confidential,
  labels: issue.labels ?? [],
  assignees: (issue.assignees ?? []).map(toUserSummary),
  author: toUserSummary(issue.author),
  milestone: issue.milestone?.title,
  dueDate: issue.due_date ?? undefined,
  notesCount: issue.user_notes_count,
  webUrl: issue.web_url,
  createdAt: issue.created_at,
  updatedAt: issue.updated_at,
  closedAt: issue.closed_at ?? undefined,
});

const toNoteSummary = (note: GitLabNote) => ({
  id: note.id,
  body: note.body,
  author: toUserSummary(note.author),
  system: note.system,
  internal: note.internal,
  noteableType: note.noteable_type,
  noteableIid: note.noteable_iid,
  createdAt: note.created_at,
  updatedAt: note.updated_at,
});

const toMergeRequestSummary = (mr: GitLabMergeRequest) => ({
  id: mr.id,
  iid: mr.iid,
  projectId: mr.project_id,
  title: mr.title,
  description: mr.description ?? undefined,
  state: mr.state,
  draft: mr.draft,
  mergeStatus: mr.detailed_merge_status ?? mr.merge_status,
  hasConflicts: mr.has_conflicts,
  sourceBranch: mr.source_branch,
  targetBranch: mr.target_branch,
  sha: mr.sha,
  mergeCommitSha: mr.merge_commit_sha ?? undefined,
  squashCommitSha: mr.squash_commit_sha ?? undefined,
  squash: mr.squash,
  removeSourceBranch: mr.force_remove_source_branch ?? mr.should_remove_source_branch ?? undefined,
  labels: mr.labels ?? [],
  author: toUserSummary(mr.author),
  assignees: (mr.assignees ?? []).map(toUserSummary),
  reviewers: (mr.reviewers ?? []).map(toUserSummary),
  mergedBy: toUserSummary(mr.merge_user ?? mr.merged_by),
  changesCount: mr.changes_count,
  notesCount: mr.user_notes_count,
  headPipeline: mr.head_pipeline
    ? { id: mr.head_pipeline.id, status: mr.head_pipeline.status, webUrl: mr.head_pipeline.web_url }
    : undefined,
  webUrl: mr.web_url,
  createdAt: mr.created_at,
  updatedAt: mr.updated_at,
  mergedAt: mr.merged_at ?? undefined,
  closedAt: mr.closed_at ?? undefined,
});

const toApprovalSummary = (approvals: GitLabApprovals) => ({
  approved: approvals.approved,
  approvalsRequired: approvals.approvals_required ?? undefined,
  approvalsLeft: approvals.approvals_left ?? undefined,
  approvedBy: (approvals.approved_by ?? []).map((entry) => toUserSummary(entry.user)),
  userHasApproved: approvals.user_has_approved,
  userCanApprove: approvals.user_can_approve,
});

const toChangedFile = (diff: GitLabDiff) => ({
  oldPath: diff.old_path,
  newPath: diff.new_path,
  newFile: diff.new_file,
  renamedFile: diff.renamed_file,
  deletedFile: diff.deleted_file,
});

const toFileDiff = (diff: GitLabDiff) => {
  const text = diff.diff ?? '';
  return {
    ...toChangedFile(diff),
    diff: text.length > DIFF_TEXT_LIMIT ? text.slice(0, DIFF_TEXT_LIMIT) : text,
    diffTruncated: text.length > DIFF_TEXT_LIMIT,
  };
};

const toCommitSummary = (commit: GitLabCommit) => ({
  id: commit.id,
  shortId: commit.short_id,
  title: commit.title,
  message: commit.message,
  authorName: commit.author_name,
  authorEmail: commit.author_email,
  authoredDate: commit.authored_date,
  committerName: commit.committer_name,
  committedDate: commit.committed_date,
  parentIds: commit.parent_ids ?? [],
  stats: commit.stats,
  webUrl: commit.web_url,
});

const toBranchSummary = (branch: GitLabBranch) => ({
  name: branch.name,
  default: branch.default,
  protected: branch.protected,
  merged: branch.merged,
  commit: branch.commit ? toCommitSummary(branch.commit) : undefined,
  webUrl: branch.web_url,
});

const toTagSummary = (tag: GitLabTag) => ({
  name: tag.name,
  message: tag.message ?? undefined,
  target: tag.target,
  protected: tag.protected,
  commit: tag.commit ? toCommitSummary(tag.commit) : undefined,
  release: tag.release
    ? { tagName: tag.release.tag_name, description: tag.release.description }
    : undefined,
});

const toLabelSummary = (label: GitLabLabel) => ({
  id: label.id,
  name: label.name,
  color: label.color,
  textColor: label.text_color,
  description: label.description ?? undefined,
});

const toSearchBlobSummary = (blob: GitLabSearchBlob) => ({
  projectId: blob.project_id,
  path: blob.path,
  filename: blob.filename,
  basename: blob.basename,
  ref: blob.ref,
  startLine: blob.startline,
  data: blob.data,
});

const toPipelineSummary = (pipeline: GitLabPipeline) => ({
  id: pipeline.id,
  iid: pipeline.iid,
  projectId: pipeline.project_id,
  status: pipeline.status,
  source: pipeline.source,
  ref: pipeline.ref,
  sha: pipeline.sha,
  user: toUserSummary(pipeline.user),
  yamlErrors: pipeline.yaml_errors ?? undefined,
  duration: pipeline.duration ?? undefined,
  queuedDuration: pipeline.queued_duration ?? undefined,
  webUrl: pipeline.web_url,
  createdAt: pipeline.created_at,
  updatedAt: pipeline.updated_at,
  startedAt: pipeline.started_at ?? undefined,
  finishedAt: pipeline.finished_at ?? undefined,
});

const toJobSummary = (job: GitLabJob) => ({
  id: job.id,
  name: job.name,
  stage: job.stage,
  status: job.status,
  ref: job.ref,
  allowFailure: job.allow_failure,
  failureReason: job.failure_reason,
  pipelineId: job.pipeline?.id,
  artifacts: (job.artifacts ?? []).map((artifact) => ({
    fileType: artifact.file_type,
    filename: artifact.filename,
    size: artifact.size,
  })),
  duration: job.duration ?? undefined,
  webUrl: job.web_url,
  createdAt: job.created_at,
  startedAt: job.started_at ?? undefined,
  finishedAt: job.finished_at ?? undefined,
});

const toPipelineScheduleSummary = (schedule: GitLabPipelineSchedule) => ({
  id: schedule.id,
  description: schedule.description,
  ref: schedule.ref,
  cron: schedule.cron,
  cronTimezone: schedule.cron_timezone,
  nextRunAt: schedule.next_run_at,
  active: schedule.active,
  owner: toUserSummary(schedule.owner),
});

const toEnvironmentSummary = (environment: GitLabEnvironment) => ({
  id: environment.id,
  name: environment.name,
  slug: environment.slug,
  state: environment.state,
  tier: environment.tier,
  externalUrl: environment.external_url ?? undefined,
  lastDeployment: environment.last_deployment
    ? {
        id: environment.last_deployment.id,
        status: environment.last_deployment.status,
        ref: environment.last_deployment.ref,
        sha: environment.last_deployment.sha,
        createdAt: environment.last_deployment.created_at,
      }
    : undefined,
});

const toDeploymentSummary = (deployment: GitLabDeployment) => ({
  id: deployment.id,
  iid: deployment.iid,
  status: deployment.status,
  ref: deployment.ref,
  sha: deployment.sha,
  environment: deployment.environment?.name,
  job: deployment.deployable
    ? {
        id: deployment.deployable.id,
        name: deployment.deployable.name,
        status: deployment.deployable.status,
        pipelineId: deployment.deployable.pipeline?.id,
      }
    : undefined,
  user: toUserSummary(deployment.user),
  createdAt: deployment.created_at,
  updatedAt: deployment.updated_at,
  finishedAt: deployment.finished_at ?? undefined,
});

const readIntHeader = (response: AxiosResponse, name: string): number | undefined => {
  const raw = response.headers?.[name];
  if (raw === undefined || raw === null || raw === '') {
    return undefined;
  }
  const parsed = Number(raw);
  return Number.isNaN(parsed) ? undefined : parsed;
};

/** GitLab paginates via `x-page` / `x-per-page` / `x-next-page` / `x-total` headers. */
const toPage = <T, U>(response: AxiosResponse<T[]>, mapItem: (item: T) => U) => {
  const nextPage = readIntHeader(response, 'x-next-page');
  return {
    values: (response.data ?? []).map(mapItem),
    page: readIntHeader(response, 'x-page'),
    perPage: readIntHeader(response, 'x-per-page'),
    total: readIntHeader(response, 'x-total'),
    nextPage,
    hasMore: nextPage !== undefined,
  };
};

const joinLabels = (labelList?: string[]) => (labelList ? labelList.join(',') : undefined);

const decodeFileContent = (file: GitLabRepositoryFile) => {
  if (file.encoding !== 'base64' || file.content === undefined) {
    return { content: file.content, encoding: file.encoding };
  }
  const buffer = Buffer.from(file.content, 'base64');
  const text = buffer.toString('utf8');
  // Round-trip check: binary content does not survive utf8 decoding intact.
  const isText = Buffer.from(text, 'utf8').equals(buffer);
  return isText
    ? { content: text, encoding: 'text' }
    : { content: file.content, encoding: 'base64' };
};

const truncateText = (text: string, maxLength: number, keep: 'start' | 'end') => {
  if (text.length <= maxLength) {
    return { content: text, truncated: false };
  }
  return {
    content: keep === 'start' ? text.slice(0, maxLength) : text.slice(text.length - maxLength),
    truncated: true,
  };
};

export const GitLab: ConnectorSpec = {
  metadata: {
    id: '.gitlab',
    displayName: 'GitLab',
    description: i18n.translate('core.kibanaConnectorSpecs.gitlab.metadata.description', {
      defaultMessage:
        'Manage issues, merge requests, branches, files, and CI/CD pipelines, and search code in GitLab.com or self-managed GitLab',
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
        type: 'api_key_header',
        isRecommended: true,
        defaults: { headerField: 'PRIVATE-TOKEN' },
        overrides: {
          label: i18n.translate('core.kibanaConnectorSpecs.gitlab.auth.privateToken.label', {
            defaultMessage: 'Access token (PRIVATE-TOKEN header)',
          }),
          meta: {
            headerField: { hidden: true },
            'PRIVATE-TOKEN': {
              label: i18n.translate(
                'core.kibanaConnectorSpecs.gitlab.auth.privateToken.token.label',
                {
                  defaultMessage: 'Access token',
                }
              ),
              placeholder: 'glpat-...',
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.gitlab.auth.privateToken.token.helpText',
                {
                  defaultMessage:
                    'A GitLab personal, project, group, or instance access token with the api scope (or read_api for read-only use). Fine-grained tokens need the Projects, Project Planning, Repository, CI/CD, Search, Groups, and Note resources. Sent as the PRIVATE-TOKEN header.',
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
          label: i18n.translate('core.kibanaConnectorSpecs.gitlab.auth.bearer.label', {
            defaultMessage: 'Access token (Authorization: Bearer)',
          }),
          meta: {
            token: {
              label: i18n.translate('core.kibanaConnectorSpecs.gitlab.auth.bearer.token.label', {
                defaultMessage: 'Access token',
              }),
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.gitlab.auth.bearer.token.helpText',
                {
                  defaultMessage:
                    'The same GitLab access token (api scope), sent as an Authorization: Bearer header instead of PRIVATE-TOKEN. Use this when a proxy in front of a self-managed instance strips custom headers.',
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
      baseUrl: UISchemas.url(GITLAB_DEFAULT_BASE_URL)
        .optional()
        .describe('GitLab instance URL')
        .meta({
          label: i18n.translate('core.kibanaConnectorSpecs.gitlab.config.baseUrl.label', {
            defaultMessage: 'GitLab URL',
          }),
          helpText: i18n.translate('core.kibanaConnectorSpecs.gitlab.config.baseUrl.helpText', {
            defaultMessage:
              'Leave empty for GitLab.com (https://gitlab.com). For a self-managed or dedicated instance, enter its base URL, e.g. https://gitlab.example.com (without /api/v4).',
          }),
        }),
    })
  ),

  validateUrls: {
    fields: ['baseUrl'],
  },

  actions: {
    // =========================================================================
    // Projects, users, groups
    // =========================================================================

    listProjects: {
      isTool: true,
      scope: 'read',
      description:
        "List projects the token can see, filtered by a name/path search, membership, ownership, or visibility. Returns each project's numeric id, full path (namespace/project), default branch, and URL. Use this first to resolve the projectId that every other action needs. Defaults to projects the user is a member of.",
      input: ListProjectsInputSchema,
      handler: async (ctx, input: ListProjectsInput) =>
        runAction('listProjects', async () => {
          const response = await ctx.client.get<GitLabProject[]>(`${buildApiUrl(ctx)}/projects`, {
            params: {
              search: input.search,
              membership: input.membership ?? true,
              owned: input.owned,
              visibility: input.visibility,
              order_by: input.orderBy,
              sort: input.sort,
              simple: true,
              page: input.page,
              per_page: input.perPage,
            },
          });
          return toPage(response, toProjectSummary);
        }),
    },

    getProject: {
      isTool: true,
      scope: 'read',
      description:
        'Get a single project by numeric id or "namespace/project" path, returning its metadata, namespace, default branch, visibility, topics, and URL.',
      input: GetProjectInputSchema,
      handler: async (ctx, input: GetProjectInput) =>
        runAction('getProject', async () => {
          const response = await ctx.client.get<GitLabProject>(
            buildProjectUrl(ctx, input.projectId)
          );
          return toProjectSummary(response.data);
        }),
    },

    listUsers: {
      isTool: true,
      scope: 'read',
      description:
        'Find users by name, username, or public email, or look one up by exact username. Returns id, username, name, and state. Use the numeric id for assigneeIds and reviewerIds, and the username for @mentions in notes. Read-only: no user administration.',
      input: ListUsersInputSchema,
      handler: async (ctx, input: ListUsersInput) =>
        runAction('listUsers', async () => {
          const response = await ctx.client.get<GitLabUser[]>(`${buildApiUrl(ctx)}/users`, {
            params: {
              search: input.search,
              username: input.username,
              active: input.active,
              page: input.page,
              per_page: input.perPage,
            },
          });
          return toPage(response, (user) => toUserSummary(user));
        }),
    },

    listGroups: {
      isTool: true,
      scope: 'read',
      description:
        "List groups the token can see, optionally filtered by name/path. Returns id, name, full path, visibility, and URL. Use a group's full path or id to scope listProjects searches or searchCode.",
      input: ListGroupsInputSchema,
      handler: async (ctx, input: ListGroupsInput) =>
        runAction('listGroups', async () => {
          const response = await ctx.client.get<GitLabGroup[]>(`${buildApiUrl(ctx)}/groups`, {
            params: {
              search: input.search,
              top_level_only: input.topLevelOnly,
              page: input.page,
              per_page: input.perPage,
            },
          });
          return toPage(response, toGroupSummary);
        }),
    },

    // =========================================================================
    // Issues
    // =========================================================================

    listIssues: {
      isTool: true,
      scope: 'read',
      description:
        'List issues in a project, filtered by state, labels, full-text search, assignee, author, or dates, with ordering and pagination. Returns issue summaries with iid, title, state, labels, assignees, and URL. Use the iid with getIssue, updateIssue, and createIssueNote.',
      input: ListIssuesInputSchema,
      handler: async (ctx, input: ListIssuesInput) =>
        runAction('listIssues', async () => {
          const response = await ctx.client.get<GitLabIssue[]>(
            `${buildProjectUrl(ctx, input.projectId)}/issues`,
            {
              params: {
                state: input.state,
                labels: joinLabels(input.labels),
                search: input.search,
                assignee_username: input.assigneeUsername,
                author_username: input.authorUsername,
                created_after: input.createdAfter,
                updated_after: input.updatedAfter,
                order_by: input.orderBy,
                sort: input.sort,
                page: input.page,
                per_page: input.perPage,
              },
            }
          );
          return toPage(response, toIssueSummary);
        }),
    },

    getIssue: {
      isTool: true,
      scope: 'read',
      description:
        'Get a single issue by project and iid, including description, state, labels, assignees, author, milestone, due date, and URL.',
      input: GetIssueInputSchema,
      handler: async (ctx, input: GetIssueInput) =>
        runAction('getIssue', async () => {
          const response = await ctx.client.get<GitLabIssue>(
            `${buildProjectUrl(ctx, input.projectId)}/issues/${input.issueIid}`
          );
          return toIssueSummary(response.data);
        }),
    },

    createIssue: {
      isTool: true,
      scope: 'write',
      description:
        'Create an issue in a project with a title and optional description, labels, assignees, type, confidentiality, and due date. Returns the new issue including its iid and URL. Use this to turn an alert or finding into a tracked ticket.',
      input: CreateIssueInputSchema,
      handler: async (ctx, input: CreateIssueInput) =>
        runAction('createIssue', async () => {
          const response = await ctx.client.post<GitLabIssue>(
            `${buildProjectUrl(ctx, input.projectId)}/issues`,
            {
              title: input.title,
              description: input.description,
              labels: joinLabels(input.labels),
              assignee_ids: input.assigneeIds,
              confidential: input.confidential,
              issue_type: input.issueType,
              due_date: input.dueDate,
            }
          );
          return toIssueSummary(response.data);
        }),
    },

    updateIssue: {
      isTool: true,
      scope: 'destroy',
      description:
        'Update an issue: change title or description, close or reopen it (stateEvent), replace/add/remove labels, reassign, or set confidentiality and due date. Only the fields you provide change. Returns the updated issue. Use this to close an issue after remediation or relabel it during triage.',
      input: UpdateIssueInputSchema,
      handler: async (ctx, input: UpdateIssueInput) =>
        runAction('updateIssue', async () => {
          const response = await ctx.client.put<GitLabIssue>(
            `${buildProjectUrl(ctx, input.projectId)}/issues/${input.issueIid}`,
            {
              title: input.title,
              description: input.description,
              state_event: input.stateEvent,
              labels: joinLabels(input.labels),
              add_labels: joinLabels(input.addLabels),
              remove_labels: joinLabels(input.removeLabels),
              assignee_ids: input.assigneeIds,
              confidential: input.confidential,
              due_date: input.dueDate,
            }
          );
          return toIssueSummary(response.data);
        }),
    },

    createIssueNote: {
      isTool: true,
      scope: 'write',
      description:
        'Post a comment (note) on an issue, optionally as an internal note visible only to project members. Returns the note id, body, and author. Use this to write status, enrichment, or links back to the issue thread.',
      input: CreateIssueNoteInputSchema,
      handler: async (ctx, input: CreateIssueNoteInput) =>
        runAction('createIssueNote', async () => {
          const response = await ctx.client.post<GitLabNote>(
            `${buildProjectUrl(ctx, input.projectId)}/issues/${input.issueIid}/notes`,
            { body: input.body, internal: input.internal }
          );
          return toNoteSummary(response.data);
        }),
    },

    // =========================================================================
    // Merge requests
    // =========================================================================

    listMergeRequests: {
      isTool: true,
      scope: 'read',
      description:
        'List merge requests in a project, filtered by state, source or target branch, labels, full-text search, or author, with ordering and pagination. Returns merge request summaries with iid, title, state, mergeStatus, branches, and URL. Use the iid with getMergeRequest, updateMergeRequest, approveMergeRequest, acceptMergeRequest, and createMergeRequestNote.',
      input: ListMergeRequestsInputSchema,
      handler: async (ctx, input: ListMergeRequestsInput) =>
        runAction('listMergeRequests', async () => {
          const response = await ctx.client.get<GitLabMergeRequest[]>(
            `${buildProjectUrl(ctx, input.projectId)}/merge_requests`,
            {
              params: {
                state: input.state,
                source_branch: input.sourceBranch,
                target_branch: input.targetBranch,
                labels: joinLabels(input.labels),
                search: input.search,
                author_username: input.authorUsername,
                order_by: input.orderBy,
                sort: input.sort,
                page: input.page,
                per_page: input.perPage,
              },
            }
          );
          return toPage(response, toMergeRequestSummary);
        }),
    },

    getMergeRequest: {
      isTool: true,
      scope: 'read',
      description:
        'Get a merge request by project and iid: state, mergeStatus (e.g. "mergeable", "not_approved", "ci_still_running", "conflict"), branches, head SHA, head pipeline, labels, assignees, reviewers, and by default the approval state (approved, approvalsLeft, approvedBy) and the list of changed files without diff text (first 100 files; changedFilesTruncated is true when there may be more). Use this to decide whether to approve or merge.',
      input: GetMergeRequestInputSchema,
      handler: async (ctx, input: GetMergeRequestInput) =>
        runAction('getMergeRequest', async () => {
          const url = `${buildProjectUrl(ctx, input.projectId)}/merge_requests/${
            input.mergeRequestIid
          }`;
          const mergeRequest = await ctx.client.get<GitLabMergeRequest>(url);
          const summary = toMergeRequestSummary(mergeRequest.data);
          if (input.includeDiffSummary === false) {
            return summary;
          }
          const [approvals, diffs] = await Promise.all([
            ctx.client.get<GitLabApprovals>(`${url}/approvals`),
            ctx.client.get<GitLabDiff[]>(`${url}/diffs`, {
              params: { per_page: DIFF_FILE_LIMIT },
            }),
          ]);
          const changedFiles = (diffs.data ?? []).map(toChangedFile);
          return {
            ...summary,
            approvals: toApprovalSummary(approvals.data),
            changedFiles,
            // Only the first page of diffs is fetched; flag when the MR may touch more files.
            changedFilesTruncated: changedFiles.length >= DIFF_FILE_LIMIT,
          };
        }),
    },

    createMergeRequest: {
      isTool: true,
      scope: 'write',
      description:
        'Open a merge request from a source branch into a target branch with a title and optional description, labels, assignees, reviewers, squash, and remove-source-branch settings. Returns the new merge request including its iid and URL. Prefix the title with "Draft: " to open it as a draft.',
      input: CreateMergeRequestInputSchema,
      handler: async (ctx, input: CreateMergeRequestInput) =>
        runAction('createMergeRequest', async () => {
          const response = await ctx.client.post<GitLabMergeRequest>(
            `${buildProjectUrl(ctx, input.projectId)}/merge_requests`,
            {
              title: input.title,
              source_branch: input.sourceBranch,
              target_branch: input.targetBranch,
              description: input.description,
              labels: joinLabels(input.labels),
              assignee_ids: input.assigneeIds,
              reviewer_ids: input.reviewerIds,
              remove_source_branch: input.removeSourceBranch,
              squash: input.squash,
            }
          );
          return toMergeRequestSummary(response.data);
        }),
    },

    updateMergeRequest: {
      isTool: true,
      scope: 'destroy',
      description:
        'Update a merge request: change title, description, or target branch, close or reopen it (stateEvent), replace/add/remove labels, set assignees or reviewers, or toggle squash and remove-source-branch. Only the fields you provide change. Returns the updated merge request.',
      input: UpdateMergeRequestInputSchema,
      handler: async (ctx, input: UpdateMergeRequestInput) =>
        runAction('updateMergeRequest', async () => {
          const response = await ctx.client.put<GitLabMergeRequest>(
            `${buildProjectUrl(ctx, input.projectId)}/merge_requests/${input.mergeRequestIid}`,
            {
              title: input.title,
              description: input.description,
              target_branch: input.targetBranch,
              state_event: input.stateEvent,
              labels: joinLabels(input.labels),
              add_labels: joinLabels(input.addLabels),
              remove_labels: joinLabels(input.removeLabels),
              assignee_ids: input.assigneeIds,
              reviewer_ids: input.reviewerIds,
              remove_source_branch: input.removeSourceBranch,
              squash: input.squash,
            }
          );
          return toMergeRequestSummary(response.data);
        }),
    },

    approveMergeRequest: {
      isTool: true,
      scope: 'write',
      description:
        "Approve a merge request as the token's user, optionally pinned to a specific head SHA so the approval fails if new commits were pushed. Returns the approval state. GitLab rejects self-approval unless the project allows it.",
      input: ApproveMergeRequestInputSchema,
      handler: async (ctx, input: ApproveMergeRequestInput) =>
        runAction('approveMergeRequest', async () => {
          const response = await ctx.client.post<GitLabApprovals>(
            `${buildProjectUrl(ctx, input.projectId)}/merge_requests/${
              input.mergeRequestIid
            }/approve`,
            { sha: input.sha }
          );
          return toApprovalSummary(response.data);
        }),
    },

    acceptMergeRequest: {
      isTool: true,
      scope: 'destroy',
      description:
        'Merge a merge request into its target branch now, or with autoMerge=true set it to merge automatically when its pipeline succeeds. Supports squash, custom commit messages, deleting the source branch, and pinning to a head SHA. Returns the merged (or auto-merge-scheduled) merge request. GitLab returns 405/422 when approvals, pipeline, or conflicts block the merge; check getMergeRequest.mergeStatus first.',
      input: AcceptMergeRequestInputSchema,
      handler: async (ctx, input: AcceptMergeRequestInput) =>
        runAction('acceptMergeRequest', async () => {
          const response = await ctx.client.put<GitLabMergeRequest>(
            `${buildProjectUrl(ctx, input.projectId)}/merge_requests/${
              input.mergeRequestIid
            }/merge`,
            {
              merge_commit_message: input.mergeCommitMessage,
              squash: input.squash,
              squash_commit_message: input.squashCommitMessage,
              should_remove_source_branch: input.shouldRemoveSourceBranch,
              auto_merge: input.autoMerge,
              sha: input.sha,
            }
          );
          return toMergeRequestSummary(response.data);
        }),
    },

    createMergeRequestNote: {
      isTool: true,
      scope: 'write',
      description:
        'Post a comment (note) on a merge request, optionally as an internal note. Returns the note id, body, and author. Use this to leave automated review findings or status on the merge request.',
      input: CreateMergeRequestNoteInputSchema,
      handler: async (ctx, input: CreateMergeRequestNoteInput) =>
        runAction('createMergeRequestNote', async () => {
          const response = await ctx.client.post<GitLabNote>(
            `${buildProjectUrl(ctx, input.projectId)}/merge_requests/${
              input.mergeRequestIid
            }/notes`,
            { body: input.body, internal: input.internal }
          );
          return toNoteSummary(response.data);
        }),
    },

    // =========================================================================
    // Repository
    // =========================================================================

    listBranches: {
      isTool: true,
      scope: 'read',
      description:
        'List branches in a project, optionally filtered by name, with their tip commit and protected/merged flags. Use this to find targets for createMergeRequest or triggerPipeline.',
      input: ListBranchesInputSchema,
      handler: async (ctx, input: ListBranchesInput) =>
        runAction('listBranches', async () => {
          const response = await ctx.client.get<GitLabBranch[]>(
            `${buildProjectUrl(ctx, input.projectId)}/repository/branches`,
            { params: { search: input.search, page: input.page, per_page: input.perPage } }
          );
          return toPage(response, toBranchSummary);
        }),
    },

    createBranch: {
      isTool: true,
      scope: 'write',
      description:
        'Create a branch from an existing branch name or commit SHA. Returns the new branch and its tip commit. This is the first step of an automated fix: create the branch, commit with createFile/updateFile, then open a merge request with createMergeRequest.',
      input: CreateBranchInputSchema,
      handler: async (ctx, input: CreateBranchInput) =>
        runAction('createBranch', async () => {
          const response = await ctx.client.post<GitLabBranch>(
            `${buildProjectUrl(ctx, input.projectId)}/repository/branches`,
            { branch: input.branch, ref: input.ref }
          );
          return toBranchSummary(response.data);
        }),
    },

    listCommits: {
      isTool: true,
      scope: 'read',
      description:
        'List commits on a branch, tag, or from a SHA (newest first), optionally limited to a file path, date range, or author. Returns commit id, short id, title, author, and dates. Use this to correlate a change with an incident or build a changelog.',
      input: ListCommitsInputSchema,
      handler: async (ctx, input: ListCommitsInput) =>
        runAction('listCommits', async () => {
          const response = await ctx.client.get<GitLabCommit[]>(
            `${buildProjectUrl(ctx, input.projectId)}/repository/commits`,
            {
              params: {
                ref_name: input.refName,
                path: input.path,
                since: input.since,
                until: input.until,
                author: input.author,
                page: input.page,
                per_page: input.perPage,
              },
            }
          );
          return toPage(response, toCommitSummary);
        }),
    },

    getCommit: {
      isTool: true,
      scope: 'read',
      description:
        "Get a single commit by SHA (or branch/tag name) with its message, author, dates, parents, and line stats, plus by default the per-file diff for the first 100 changed files (each file's diff text truncated to 4000 characters; diffsTruncated is true when the commit may touch more files). Set includeDiff=false for metadata only.",
      input: GetCommitInputSchema,
      handler: async (ctx, input: GetCommitInput) =>
        runAction('getCommit', async () => {
          const url = `${buildProjectUrl(
            ctx,
            input.projectId
          )}/repository/commits/${encodeURIComponent(input.sha)}`;
          const commit = await ctx.client.get<GitLabCommit>(url);
          const summary = toCommitSummary(commit.data);
          if (input.includeDiff === false) {
            return summary;
          }
          const diffs = await ctx.client.get<GitLabDiff[]>(`${url}/diff`, {
            params: { per_page: DIFF_FILE_LIMIT },
          });
          const fileDiffs = (diffs.data ?? []).map(toFileDiff);
          return {
            ...summary,
            diffs: fileDiffs,
            // Only the first page of file diffs is fetched; flag when the commit may touch more files.
            diffsTruncated: fileDiffs.length >= DIFF_FILE_LIMIT,
          };
        }),
    },

    getFile: {
      isTool: true,
      scope: 'read',
      description:
        'Read a file from the repository at a branch, tag, or commit. Returns the decoded text content (or base64 for binary files), size, and lastCommitId. Pass lastCommitId to updateFile or deleteFile to guard against concurrent changes. Use this to inspect configuration or manifests before proposing a fix.',
      input: GetFileInputSchema,
      handler: async (ctx, input: GetFileInput) =>
        runAction('getFile', async () => {
          const response = await ctx.client.get<GitLabRepositoryFile>(
            `${buildProjectUrl(ctx, input.projectId)}/repository/files/${encodeURIComponent(
              input.filePath
            )}`,
            { params: { ref: input.ref } }
          );
          const file = response.data;
          return {
            filePath: file.file_path,
            fileName: file.file_name,
            ref: file.ref,
            size: file.size,
            ...decodeFileContent(file),
            contentSha256: file.content_sha256,
            blobId: file.blob_id,
            commitId: file.commit_id,
            lastCommitId: file.last_commit_id,
          };
        }),
    },

    createFile: {
      isTool: true,
      scope: 'write',
      description:
        'Create a new file in the repository as a commit on a branch (optionally creating that branch from startBranch first). Fails if the file already exists; use updateFile for existing files. Returns the file path and branch. Use this for GitOps remediation: commit a fix, then open a merge request.',
      input: CreateFileInputSchema,
      handler: async (ctx, input: CreateFileInput) =>
        runAction('createFile', async () => {
          const response = await ctx.client.post<GitLabFileCommitResult>(
            `${buildProjectUrl(ctx, input.projectId)}/repository/files/${encodeURIComponent(
              input.filePath
            )}`,
            {
              branch: input.branch,
              start_branch: input.startBranch,
              content: input.content,
              commit_message: input.commitMessage,
              author_name: input.authorName,
              author_email: input.authorEmail,
            }
          );
          return { filePath: response.data.file_path, branch: response.data.branch };
        }),
    },

    updateFile: {
      isTool: true,
      scope: 'destroy',
      description:
        'Replace the full content of an existing file as a commit on a branch (optionally creating that branch from startBranch first). Pass lastCommitId from getFile so the commit fails if the file changed in the meantime. Returns the file path and branch.',
      input: UpdateFileInputSchema,
      handler: async (ctx, input: UpdateFileInput) =>
        runAction('updateFile', async () => {
          const response = await ctx.client.put<GitLabFileCommitResult>(
            `${buildProjectUrl(ctx, input.projectId)}/repository/files/${encodeURIComponent(
              input.filePath
            )}`,
            {
              branch: input.branch,
              start_branch: input.startBranch,
              content: input.content,
              commit_message: input.commitMessage,
              last_commit_id: input.lastCommitId,
              author_name: input.authorName,
              author_email: input.authorEmail,
            }
          );
          return { filePath: response.data.file_path, branch: response.data.branch };
        }),
    },

    deleteFile: {
      isTool: true,
      scope: 'destroy',
      description:
        'Delete a file from the repository as a commit on a branch. Pass lastCommitId from getFile to fail if the file changed in the meantime. Returns a confirmation. Prefer committing to a fix branch and opening a merge request over deleting on a protected branch directly.',
      input: DeleteFileInputSchema,
      handler: async (ctx, input: DeleteFileInput) =>
        runAction('deleteFile', async () => {
          await ctx.client.delete(
            `${buildProjectUrl(ctx, input.projectId)}/repository/files/${encodeURIComponent(
              input.filePath
            )}`,
            {
              data: {
                branch: input.branch,
                commit_message: input.commitMessage,
                last_commit_id: input.lastCommitId,
                author_name: input.authorName,
                author_email: input.authorEmail,
              },
            }
          );
          return { deleted: true, filePath: input.filePath, branch: input.branch };
        }),
    },

    listTags: {
      isTool: true,
      scope: 'read',
      description:
        'List tags in a project, optionally filtered by name and ordered by name, update time, or semantic version. Returns each tag with its target commit and release notes when present. Use this to find release versions.',
      input: ListTagsInputSchema,
      handler: async (ctx, input: ListTagsInput) =>
        runAction('listTags', async () => {
          const response = await ctx.client.get<GitLabTag[]>(
            `${buildProjectUrl(ctx, input.projectId)}/repository/tags`,
            {
              params: {
                search: input.search,
                order_by: input.orderBy,
                sort: input.sort,
                page: input.page,
                per_page: input.perPage,
              },
            }
          );
          return toPage(response, toTagSummary);
        }),
    },

    listLabels: {
      isTool: true,
      scope: 'read',
      description:
        'List the labels available in a project (including inherited group labels), optionally filtered by name. Use the exact names with the labels fields of createIssue, updateIssue, createMergeRequest, and updateMergeRequest.',
      input: ListLabelsInputSchema,
      handler: async (ctx, input: ListLabelsInput) =>
        runAction('listLabels', async () => {
          const response = await ctx.client.get<GitLabLabel[]>(
            `${buildProjectUrl(ctx, input.projectId)}/labels`,
            {
              params: {
                search: input.search,
                include_ancestor_groups: true,
                page: input.page,
                per_page: input.perPage,
              },
            }
          );
          return toPage(response, toLabelSummary);
        }),
    },

    searchCode: {
      isTool: true,
      scope: 'read',
      description:
        'Search file contents (code) for a term, scoped to a project (recommended), a group, or the whole instance. Returns matching files with path, ref, start line, and the matching snippet. Project-scoped search works on every GitLab tier; group and instance scope require GitLab Advanced Search (Premium/Ultimate) and return 403 otherwise. Use this for IOC hunting or finding where a setting is defined.',
      input: SearchCodeInputSchema,
      handler: async (ctx, input: SearchCodeInput) =>
        runAction('searchCode', async () => {
          const apiUrl = buildApiUrl(ctx);
          const url = input.projectId
            ? `${buildProjectUrl(ctx, input.projectId)}/search`
            : input.groupId
            ? `${apiUrl}/groups/${encodeURIComponent(input.groupId.trim())}/search`
            : `${apiUrl}/search`;
          const response = await ctx.client.get<GitLabSearchBlob[]>(url, {
            params: {
              scope: 'blobs',
              search: input.search,
              ref: input.projectId ? input.ref : undefined,
              page: input.page,
              per_page: input.perPage,
            },
          });
          return toPage(response, toSearchBlobSummary);
        }),
    },

    // =========================================================================
    // CI/CD
    // =========================================================================

    listPipelines: {
      isTool: true,
      scope: 'read',
      description:
        'List pipelines in a project, filtered by status, ref, SHA, source, or user, ordered newest first by default. Returns pipeline id, status, ref, SHA, and URL. Use this to find the latest pipeline for a branch before gating on CI state.',
      input: ListPipelinesInputSchema,
      handler: async (ctx, input: ListPipelinesInput) =>
        runAction('listPipelines', async () => {
          const response = await ctx.client.get<GitLabPipeline[]>(
            `${buildProjectUrl(ctx, input.projectId)}/pipelines`,
            {
              params: {
                status: input.status,
                ref: input.ref,
                sha: input.sha,
                source: input.source,
                username: input.username,
                updated_after: input.updatedAfter,
                order_by: input.orderBy,
                sort: input.sort,
                page: input.page,
                per_page: input.perPage,
              },
            }
          );
          return toPage(response, toPipelineSummary);
        }),
    },

    getPipeline: {
      isTool: true,
      scope: 'read',
      description:
        'Get a single pipeline by id: status (created, pending, running, success, failed, canceled, skipped, manual), ref, SHA, timing, YAML errors, and URL. Poll this after triggerPipeline until status is success, failed, or canceled.',
      input: GetPipelineInputSchema,
      handler: async (ctx, input: GetPipelineInput) =>
        runAction('getPipeline', async () => {
          const response = await ctx.client.get<GitLabPipeline>(
            `${buildProjectUrl(ctx, input.projectId)}/pipelines/${input.pipelineId}`
          );
          return toPipelineSummary(response.data);
        }),
    },

    triggerPipeline: {
      isTool: true,
      scope: 'write',
      description:
        'Start a new CI/CD pipeline for a branch or tag, optionally passing CI/CD variables. Returns the created pipeline including its id (use it with getPipeline, listJobs, cancelPipeline, retryPipeline) and URL. Requires a .gitlab-ci.yml on the ref. GitLab returns 400 when no jobs would run, when the project\'s "minimum role to use pipeline variables" setting excludes the token\'s role (new projects default to nobody, so variables fail with "Insufficient permissions to set pipeline variables"), or on GitLab.com when the namespace has not completed identity verification.',
      input: TriggerPipelineInputSchema,
      handler: async (ctx, input: TriggerPipelineInput) =>
        runAction('triggerPipeline', async () => {
          const response = await ctx.client.post<GitLabPipeline>(
            `${buildProjectUrl(ctx, input.projectId)}/pipeline`,
            {
              ref: input.ref,
              variables: input.variables?.map((variable) => ({
                key: variable.key,
                value: variable.value,
                variable_type: variable.variableType,
              })),
            }
          );
          return toPipelineSummary(response.data);
        }),
    },

    cancelPipeline: {
      isTool: true,
      scope: 'destroy',
      description:
        'Cancel a pending or running pipeline and all of its jobs. Returns the pipeline with its new status. Use this as a kill switch for a misfired or superseded run.',
      input: PipelineActionInputSchema,
      handler: async (ctx, input: PipelineActionInput) =>
        runAction('cancelPipeline', async () => {
          const response = await ctx.client.post<GitLabPipeline>(
            `${buildProjectUrl(ctx, input.projectId)}/pipelines/${input.pipelineId}/cancel`
          );
          return toPipelineSummary(response.data);
        }),
    },

    retryPipeline: {
      isTool: true,
      scope: 'write',
      description:
        'Retry the failed and canceled jobs of a pipeline, leaving successful jobs untouched. Returns the pipeline with its new status. Use this for automated recovery from a flaky failure.',
      input: PipelineActionInputSchema,
      handler: async (ctx, input: PipelineActionInput) =>
        runAction('retryPipeline', async () => {
          const response = await ctx.client.post<GitLabPipeline>(
            `${buildProjectUrl(ctx, input.projectId)}/pipelines/${input.pipelineId}/retry`
          );
          return toPipelineSummary(response.data);
        }),
    },

    listJobs: {
      isTool: true,
      scope: 'read',
      description:
        'List the jobs of a pipeline, optionally filtered by status (e.g. ["failed"]). Returns each job\'s id, name, stage, status, failure reason, artifacts, and URL. Use the job id with getJobArtifact to read its log or an artifact file.',
      input: ListJobsInputSchema,
      handler: async (ctx, input: ListJobsInput) =>
        runAction('listJobs', async () => {
          const response = await ctx.client.get<GitLabJob[]>(
            `${buildProjectUrl(ctx, input.projectId)}/pipelines/${input.pipelineId}/jobs`,
            {
              params: {
                scope: input.scope,
                include_retried: input.includeRetried,
                page: input.page,
                per_page: input.perPage,
              },
              // GitLab expects scope[]=failed&scope[]=canceled for multiple values.
              paramsSerializer: { indexes: false },
            }
          );
          return toPage(response, toJobSummary);
        }),
    },

    getJobArtifact: {
      isTool: true,
      scope: 'read',
      description:
        'Read a job\'s log (trace) or a single text file from its artifacts archive (artifactPath, e.g. "gl-sast-report.json"). Returns the content as text, truncated to maxLength characters (default 20000; logs keep the end, artifacts keep the start) with a truncated flag. WARNING: artifacts can be large or binary; only request files you intend to parse, and prefer JSON or text reports.',
      input: GetJobArtifactInputSchema,
      handler: async (ctx, input: GetJobArtifactInput) =>
        runAction('getJobArtifact', async () => {
          const jobUrl = `${buildProjectUrl(ctx, input.projectId)}/jobs/${input.jobId}`;
          const maxLength = input.maxLength ?? DEFAULT_ARTIFACT_LIMIT;
          const url = input.artifactPath
            ? `${jobUrl}/artifacts/${input.artifactPath
                .split('/')
                .map((segment) => encodeURIComponent(segment))
                .join('/')}`
            : `${jobUrl}/trace`;
          const response = await ctx.client.get<string>(url, {
            responseType: 'text',
            transformResponse: [(data: unknown) => data],
          });
          const text =
            typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
          const { content, truncated } = truncateText(
            text,
            maxLength,
            input.artifactPath ? 'start' : 'end'
          );
          return {
            jobId: input.jobId,
            artifactPath: input.artifactPath,
            kind: input.artifactPath ? 'artifact' : 'log',
            content,
            truncated,
            totalLength: text.length,
          };
        }),
    },

    listPipelineSchedules: {
      isTool: true,
      scope: 'read',
      description:
        'List the scheduled pipelines of a project (cron, ref, timezone, next run, owner, active flag), optionally only active or inactive ones. Use this to understand what CI runs automatically before triggering one manually.',
      input: ListPipelineSchedulesInputSchema,
      handler: async (ctx, input: ListPipelineSchedulesInput) =>
        runAction('listPipelineSchedules', async () => {
          const response = await ctx.client.get<GitLabPipelineSchedule[]>(
            `${buildProjectUrl(ctx, input.projectId)}/pipeline_schedules`,
            { params: { scope: input.scope, page: input.page, per_page: input.perPage } }
          );
          return toPage(response, toPipelineScheduleSummary);
        }),
    },

    listEnvironments: {
      isTool: true,
      scope: 'read',
      description:
        'List the deployment environments of a project (name, state, tier, external URL, last deployment), optionally filtered by name or state. Use this to find the environment name for listDeployments.',
      input: ListEnvironmentsInputSchema,
      handler: async (ctx, input: ListEnvironmentsInput) =>
        runAction('listEnvironments', async () => {
          const response = await ctx.client.get<GitLabEnvironment[]>(
            `${buildProjectUrl(ctx, input.projectId)}/environments`,
            {
              params: {
                search: input.search,
                states: input.states,
                page: input.page,
                per_page: input.perPage,
              },
            }
          );
          return toPage(response, toEnvironmentSummary);
        }),
    },

    listDeployments: {
      isTool: true,
      scope: 'read',
      description:
        'List deployments of a project, optionally filtered by environment name, status, or update time, and ordered by id, created, updated, or finished time. Returns ref, SHA, status, environment, the deploy job, and the user. Use this to correlate an incident with what was deployed and when.',
      input: ListDeploymentsInputSchema,
      handler: async (ctx, input: ListDeploymentsInput) =>
        runAction('listDeployments', async () => {
          const response = await ctx.client.get<GitLabDeployment[]>(
            `${buildProjectUrl(ctx, input.projectId)}/deployments`,
            {
              params: {
                environment: input.environment,
                status: input.status,
                updated_after: input.updatedAfter,
                order_by: input.orderBy,
                sort: input.sort,
                page: input.page,
                per_page: input.perPage,
              },
            }
          );
          return toPage(response, toDeploymentSummary);
        }),
    },
  },

  skill: [
    'GitLab - cross-action guidance for driving issues, merge requests, repository changes, and CI/CD from a workflow.',
    '',
    'Identifiers: `projectId` accepts the numeric id or the full "namespace/project" path (resolve it with `listProjects`). Issues and merge requests are addressed by `iid` (the per-project number in the URL), pipelines and jobs by their global numeric `id`, users by numeric `id` for assignments and by `username` for @mentions.',
    '',
    'Typical patterns:',
    '  - Alert to ticket: `createIssue` (labels, assigneeIds from `listUsers`), then `createIssueNote` to append enrichment; close later with `updateIssue` `stateEvent: "close"`.',
    '  - GitOps fix: `getFile` to read the current config (keep `lastCommitId`), `createBranch` from the default branch, `updateFile`/`createFile` on that branch with `lastCommitId`, then `createMergeRequest` into the default branch. `createFile`/`updateFile` with `startBranch` can create the branch in the same call.',
    '  - Gate and land a merge request: `getMergeRequest` and check `mergeStatus` is "mergeable" and `approvals.approved`; `approveMergeRequest` if a check passed (pin `sha` to the reviewed head), then `acceptMergeRequest` (or `autoMerge: true` to merge when the pipeline passes). Reject with `createMergeRequestNote` plus `updateMergeRequest` `stateEvent: "close"`.',
    '  - Run and watch CI: `triggerPipeline` for a ref with `variables`, poll `getPipeline` until `status` is success/failed/canceled, then `listJobs` with `scope: ["failed"]` and `getJobArtifact` (log or report file) to triage; `retryPipeline` for a flaky failure or `cancelPipeline` to stop a run.',
    '  - Investigate: `searchCode` scoped to a `projectId` (instance-wide search needs Advanced Search), `listCommits` with `path`/`since` and `getCommit` for the diff, `listDeployments` per `environment` to see what shipped when.',
    '',
    'Pagination: list actions return `values`, `page`, `perPage`, `nextPage`, `total` (omitted by GitLab beyond 10,000 results), and `hasMore`; pass `nextPage` as `page` to continue.',
    '',
    'Gotchas: `labels` fields are arrays of exact label names (see `listLabels`); `updateIssue`/`updateMergeRequest` `labels` replaces the whole set, use `addLabels`/`removeLabels` for incremental changes. `acceptMergeRequest` fails with 405/422 when approvals, the pipeline, or conflicts block merging. GitLab rejects self-approval unless the project allows it. `triggerPipeline` returns 400 when the ref has no .gitlab-ci.yml or no job matches, when `variables` are passed but the project\'s CI/CD setting "Minimum role to use pipeline variables" excludes the token (new GitLab projects default to "No one allowed"; a Maintainer can lower it under Settings > CI/CD > Variables), or on GitLab.com free namespaces that have not completed identity verification ("Identity verification is required in order to run CI jobs"). Access tokens for projects/groups act as bot users and cannot approve their own merge requests.',
  ].join('\n'),

  test: {
    enabled: true,
    description: i18n.translate('core.kibanaConnectorSpecs.gitlab.test.description', {
      defaultMessage: 'Verifies the connection by fetching the authenticated GitLab user.',
    }),
    handler: async (ctx) =>
      runAction('test', async () => {
        const apiUrl = buildApiUrl(ctx);
        const response = await ctx.client.get<GitLabUser>(`${apiUrl}/user`);
        return {
          message: `Connected to ${apiUrl.replace(/\/api\/v4$/, '')} as ${
            response.data.username ?? response.data.name ?? `user ${response.data.id}`
          }.`,
        };
      }),
  },
};
