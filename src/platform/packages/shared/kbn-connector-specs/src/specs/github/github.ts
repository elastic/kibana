/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * GitHub Connector (v2)
 *
 * Dual transport:
 * - MCP plane (Agent Builder): GitHub Copilot MCP server for interactive discovery
 * - GraphQL ingest plane (Workflows): GitHub GraphQL API for org-scale read-only ingest
 *
 * Auth: Bearer token (PAT or OAuth token)
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import { RETRY_RATE_LIMIT, UISchemas, type ConnectorSpec } from '../../connector_spec';
import { withMcpClient, callToolContent, callToolJson } from '../../lib/mcp';
import { executeGitHubGraphQL, getGitHubQueryTemplate, listGitHubQueryTemplates } from './graphql';
import type {
  AddAssigneeInput,
  AddIssueCommentInput,
  AddLabelsInput,
  CallToolInput,
  CreateBranchInput,
  CreateIssueInput,
  CreateOrUpdateFileInput,
  CreatePullRequestInput,
  GetCommitInput,
  GetFileContentsInput,
  GetIssueCommentsInput,
  GetIssueInput,
  GetLatestReleaseInput,
  GraphqlQueryInput,
  ListBranchesInput,
  ListCommitsInput,
  ListIssuesInput,
  ListPullRequestsInput,
  ListReleasesInput,
  ListTagsInput,
  MergePullRequestInput,
  PullRequestReadInput,
  RequestReviewersInput,
  RunQueryTemplateInput,
  SearchCodeInput,
  SearchIssuesInput,
  SearchPullRequestsInput,
  SearchRepositoriesInput,
  SearchUsersInput,
  TriggerWorkflowInput,
  UpdateIssueInput,
  UpdatePullRequestInput,
} from './types';
import {
  AddAssigneeInputSchema,
  AddIssueCommentInputSchema,
  AddLabelsInputSchema,
  CallToolInputSchema,
  CreateBranchInputSchema,
  CreateIssueInputSchema,
  CreateOrUpdateFileInputSchema,
  CreatePullRequestInputSchema,
  GetCommitInputSchema,
  GetFileContentsInputSchema,
  GetIssueCommentsInputSchema,
  GetIssueInputSchema,
  GetLatestReleaseInputSchema,
  GetMeInputSchema,
  ListBranchesInputSchema,
  ListCommitsInputSchema,
  ListIssuesInputSchema,
  ListPullRequestsInputSchema,
  ListReleasesInputSchema,
  ListTagsInputSchema,
  ListToolsInputSchema,
  MergePullRequestInputSchema,
  PullRequestReadInputSchema,
  RequestReviewersInputSchema,
  SearchCodeInputSchema,
  SearchIssuesInputSchema,
  SearchPullRequestsInputSchema,
  SearchRepositoriesInputSchema,
  SearchUsersInputSchema,
  TriggerWorkflowInputSchema,
  UpdateIssueInputSchema,
  UpdatePullRequestInputSchema,
  GraphqlQueryInputSchema,
  RunQueryTemplateInputSchema,
  ListQueryTemplatesInputSchema,
} from './types';

const GITHUB_MCP_SERVER_URL = 'https://api.githubcopilot.com/mcp/';
const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_API_VERSION_HEADER = { 'X-GitHub-Api-Version': '2022-11-28' } as const;
const GITHUB_INGEST_OAUTH_SCOPE = 'read:org read:project repo';

/** Coerce Liquid-stringified ints (e.g. number: '{{ entity.number }}') for GraphQL Int! vars. */
const coerceIntVariable = (value: unknown): unknown => {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }
  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) {
    return Number.parseInt(value, 10);
  }
  return value;
};

const mergeTemplateVariables = (
  input: RunQueryTemplateInput
): Record<string, unknown> | undefined => {
  const variables = { ...(input.variables ?? {}) };
  if (input.first !== undefined) {
    variables.first = input.first;
  }
  if (input.after !== undefined) {
    variables.after = input.after;
  }
  // Workflow templates often stringify ints; GraphQL Int! rejects strings.
  for (const key of ['number', 'first'] as const) {
    if (key in variables) {
      variables[key] = coerceIntVariable(variables[key]);
    }
  }
  return Object.keys(variables).length > 0 ? variables : undefined;
};

export const GithubConnector: ConnectorSpec = {
  metadata: {
    id: '.github',
    displayName: 'GitHub',
    description: i18n.translate('core.kibanaConnectorSpecs.github.metadata.description', {
      defaultMessage:
        'Search, browse, and manage GitHub repositories: create and update issues and pull requests, add comments, labels, and assignees, create branches, trigger workflows, and merge pull requests.',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['workflows', 'agentBuilder', 'contextEngine'],
  },

  auth: {
    types: [
      {
        type: 'oauth_authorization_code',
        defaults: {
          authorizationUrl: 'https://github.com/login/oauth/authorize',
          tokenUrl: 'https://github.com/login/oauth/access_token',
          scope: GITHUB_INGEST_OAUTH_SCOPE,
        },
        overrides: {
          meta: {
            authorizationUrl: { hidden: true },
            tokenUrl: { hidden: true },
            scope: { hidden: true },
          },
        },
      },
      {
        type: 'bearer',
        defaults: {},
        overrides: {
          label: i18n.translate('core.kibanaConnectorSpecs.github.auth.bearer.label', {
            defaultMessage: 'Personal Access Token (PAT)',
          }),
        },
      },
    ],
    headers: {
      Accept: 'application/vnd.github+json',
    },
  },

  schema: lazySchema(() =>
    z.object({
      serverUrl: UISchemas.url()
        .default(GITHUB_MCP_SERVER_URL)
        .describe('GitHub MCP Server URL')
        .meta({
          widget: 'text',
          placeholder: 'https://api.githubcopilot.com/mcp/',
          hidden: true,
          label: i18n.translate('connectorSpecs.github.config.serverUrl.label', {
            defaultMessage: 'MCP Server URL',
          }),
          helpText: i18n.translate('connectorSpecs.github.config.serverUrl.helpText', {
            defaultMessage: 'The URL of the GitHub Copilot MCP server.',
          }),
        }),
      graphqlApiUrl: UISchemas.url()
        .default('https://api.github.com/graphql')
        .describe('GitHub GraphQL API URL used by workflow ingest actions')
        .meta({
          widget: 'text',
          placeholder: 'https://api.github.com/graphql',
          label: i18n.translate('connectorSpecs.github.config.graphqlApiUrl.label', {
            defaultMessage: 'GraphQL API URL',
          }),
          helpText: i18n.translate('connectorSpecs.github.config.graphqlApiUrl.helpText', {
            defaultMessage:
              'GitHub GraphQL endpoint for read-only ingest actions (graphqlQuery, runQueryTemplate).',
          }),
        }),
    })
  ),

  validateUrls: {
    fields: ['serverUrl', 'graphqlApiUrl'],
  },

  policies: {
    rateLimit: {
      strategy: 'header',
      remainingHeader: 'x-ratelimit-remaining',
      resetHeader: 'x-ratelimit-reset',
      codes: [...RETRY_RATE_LIMIT, 403],
    },
    retry: {
      retryOnStatusCodes: [...RETRY_RATE_LIMIT, 403, 502, 503, 504],
      maxRetries: 5,
      backoffStrategy: 'exponential',
      initialDelay: 1000,
    },
  },

  actions: {
    getMe: {
      isTool: true,
      scope: 'read',
      description: 'Get the authenticated GitHub user profile.',
      input: GetMeInputSchema,
      handler: async (ctx) => {
        return callToolJson(ctx, 'get_me');
      },
    },

    searchCode: {
      isTool: true,
      scope: 'read',
      description: 'Search for code across GitHub repositories.',
      input: SearchCodeInputSchema,
      handler: async (ctx, input: SearchCodeInput) => {
        return callToolJson(ctx, 'search_code', {
          query: input.query,
          page: input.page,
          perPage: input.perPage,
        });
      },
    },

    searchRepositories: {
      isTool: true,
      scope: 'read',
      description: 'Search for GitHub repositories.',
      input: SearchRepositoriesInputSchema,
      handler: async (ctx, input: SearchRepositoriesInput) => {
        return callToolJson(ctx, 'search_repositories', {
          query: input.query,
          page: input.page,
          perPage: input.perPage,
        });
      },
    },

    searchIssues: {
      isTool: true,
      scope: 'read',
      description: 'Search for issues across GitHub repositories.',
      input: SearchIssuesInputSchema,
      handler: async (ctx, input: SearchIssuesInput) => {
        return callToolJson(ctx, 'search_issues', {
          query: input.query,
          order: input.order,
          sort: input.sort,
          page: input.page,
          perPage: input.perPage,
        });
      },
    },

    searchPullRequests: {
      isTool: true,
      scope: 'read',
      description: 'Search for pull requests across GitHub repositories.',
      input: SearchPullRequestsInputSchema,
      handler: async (ctx, input: SearchPullRequestsInput) => {
        return callToolJson(ctx, 'search_pull_requests', {
          query: input.query,
          order: input.order,
          sort: input.sort,
          page: input.page,
          perPage: input.perPage,
        });
      },
    },

    searchUsers: {
      isTool: true,
      scope: 'read',
      description: 'Search for GitHub users.',
      input: SearchUsersInputSchema,
      handler: async (ctx, input: SearchUsersInput) => {
        return callToolJson(ctx, 'search_users', {
          query: input.query,
          page: input.page,
          perPage: input.perPage,
        });
      },
    },

    listIssues: {
      isTool: true,
      scope: 'read',
      description: 'List issues in a GitHub repository. Uses cursor-based pagination.',
      input: ListIssuesInputSchema,
      handler: async (ctx, input: ListIssuesInput) => {
        return callToolJson(ctx, 'list_issues', {
          owner: input.owner,
          repo: input.repo,
          state: input.state,
          since: input.updatedSince,
          first: input.first,
          after: input.after,
        });
      },
    },

    listPullRequests: {
      isTool: true,
      scope: 'read',
      description: 'List pull requests in a GitHub repository. Uses cursor-based pagination.',
      input: ListPullRequestsInputSchema,
      handler: async (ctx, input: ListPullRequestsInput) => {
        return callToolJson(ctx, 'list_pull_requests', {
          owner: input.owner,
          repo: input.repo,
          state: input.state,
          since: input.updatedSince,
          first: input.first,
          after: input.after,
        });
      },
    },

    listCommits: {
      isTool: true,
      scope: 'read',
      description: 'List commits in a GitHub repository. Uses cursor-based pagination.',
      input: ListCommitsInputSchema,
      handler: async (ctx, input: ListCommitsInput) => {
        return callToolJson(ctx, 'list_commits', {
          owner: input.owner,
          repo: input.repo,
          sha: input.sha,
          first: input.first,
          after: input.after,
        });
      },
    },

    listBranches: {
      isTool: true,
      scope: 'read',
      description: 'List branches in a GitHub repository. Uses cursor-based pagination.',
      input: ListBranchesInputSchema,
      handler: async (ctx, input: ListBranchesInput) => {
        return callToolJson(ctx, 'list_branches', {
          owner: input.owner,
          repo: input.repo,
          first: input.first,
          after: input.after,
        });
      },
    },

    listReleases: {
      isTool: true,
      scope: 'read',
      description: 'List releases in a GitHub repository. Uses cursor-based pagination.',
      input: ListReleasesInputSchema,
      handler: async (ctx, input: ListReleasesInput) => {
        return callToolJson(ctx, 'list_releases', {
          owner: input.owner,
          repo: input.repo,
          first: input.first,
          after: input.after,
        });
      },
    },

    listTags: {
      isTool: true,
      scope: 'read',
      description: 'List tags in a GitHub repository. Uses cursor-based pagination.',
      input: ListTagsInputSchema,
      handler: async (ctx, input: ListTagsInput) => {
        return callToolJson(ctx, 'list_tags', {
          owner: input.owner,
          repo: input.repo,
          first: input.first,
          after: input.after,
        });
      },
    },

    getCommit: {
      isTool: true,
      scope: 'read',
      description: 'Get details of a specific commit.',
      input: GetCommitInputSchema,
      handler: async (ctx, input: GetCommitInput) => {
        return callToolJson(ctx, 'get_commit', {
          owner: input.owner,
          repo: input.repo,
          sha: input.sha,
        });
      },
    },

    getLatestRelease: {
      isTool: true,
      scope: 'read',
      description: 'Get the latest release of a GitHub repository.',
      input: GetLatestReleaseInputSchema,
      handler: async (ctx, input: GetLatestReleaseInput) => {
        return callToolJson(ctx, 'get_latest_release', { owner: input.owner, repo: input.repo });
      },
    },

    pullRequestRead: {
      isTool: true,
      scope: 'read',
      description: 'Read the full details of a specific pull request.',
      input: PullRequestReadInputSchema,
      handler: async (ctx, input: PullRequestReadInput) => {
        return callToolJson(ctx, 'pull_request_read', {
          owner: input.owner,
          repo: input.repo,
          pullNumber: input.pullNumber,
          method: input.method,
        });
      },
    },

    getFileContents: {
      isTool: true,
      scope: 'read',
      description: 'Get the contents of a file or directory from a GitHub repository.',
      input: GetFileContentsInputSchema,
      handler: async (ctx, input: GetFileContentsInput) => {
        return callToolContent(ctx, 'get_file_contents', {
          owner: input.owner,
          repo: input.repo,
          path: input.path,
          ref: input.ref,
        });
      },
    },

    getIssue: {
      isTool: true,
      scope: 'read',
      description: 'Get details of a specific issue in a GitHub repository.',
      input: GetIssueInputSchema,
      handler: async (ctx, input: GetIssueInput) => {
        return callToolJson(ctx, 'issue_read', {
          owner: input.owner,
          repo: input.repo,
          issue_number: input.issueNumber,
          method: 'get',
        });
      },
    },

    getIssueComments: {
      isTool: true,
      scope: 'read',
      description: 'Get comments for a specific issue in a GitHub repository.',
      input: GetIssueCommentsInputSchema,
      handler: async (ctx, input: GetIssueCommentsInput) => {
        return callToolJson(ctx, 'issue_read', {
          owner: input.owner,
          repo: input.repo,
          issue_number: input.issueNumber,
          method: 'get_comments',
        });
      },
    },

    createIssue: {
      isTool: true,
      scope: 'write',
      description:
        'Create a new issue in a GitHub repository. Returns the created issue including its number, URL, and state.',
      input: CreateIssueInputSchema,
      handler: async (ctx, input: CreateIssueInput) => {
        const { owner, repo, title, body, assignees, labels, milestone } = input;
        const requestBody: Record<string, unknown> = { title };
        if (body !== undefined) requestBody.body = body;
        if (assignees !== undefined) requestBody.assignees = assignees;
        if (labels !== undefined) requestBody.labels = labels;
        if (milestone !== undefined) requestBody.milestone = milestone;
        const response = await ctx.client.post(
          `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
            repo
          )}/issues`,
          requestBody,
          { headers: GITHUB_API_VERSION_HEADER }
        );
        return response.data;
      },
    },

    addIssueComment: {
      isTool: true,
      scope: 'write',
      description:
        'Add a comment to an existing issue or pull request. Returns the created comment including its ID and URL.',
      input: AddIssueCommentInputSchema,
      handler: async (ctx, input: AddIssueCommentInput) => {
        const { owner, repo, issueNumber, body } = input;
        const response = await ctx.client.post(
          `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
            repo
          )}/issues/${issueNumber}/comments`,
          { body },
          { headers: GITHUB_API_VERSION_HEADER }
        );
        return response.data;
      },
    },

    updateIssue: {
      isTool: true,
      scope: 'destroy',
      description:
        'Update an existing issue (title, body, state, assignees, labels, or milestone). At least one field must be provided. To close an issue set state to "closed".',
      input: UpdateIssueInputSchema,
      handler: async (ctx, input: UpdateIssueInput) => {
        const { owner, repo, issueNumber, title, body, state, assignees, labels, milestone } =
          input;
        const requestBody: Record<string, unknown> = {};
        if (title !== undefined) requestBody.title = title;
        if (body !== undefined) requestBody.body = body;
        if (state !== undefined) requestBody.state = state;
        if (assignees !== undefined) requestBody.assignees = assignees;
        if (labels !== undefined) requestBody.labels = labels;
        if (milestone !== undefined) requestBody.milestone = milestone;
        const response = await ctx.client.patch(
          `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
            repo
          )}/issues/${issueNumber}`,
          requestBody,
          { headers: GITHUB_API_VERSION_HEADER }
        );
        return response.data;
      },
    },

    createPullRequest: {
      isTool: true,
      scope: 'write',
      description:
        'Create a new pull request. The head branch must already exist and have commits not in the base branch. Returns the PR including its number and URL.',
      input: CreatePullRequestInputSchema,
      handler: async (ctx, input: CreatePullRequestInput) => {
        const { owner, repo, title, head, base, body, draft, maintainerCanModify } = input;
        const requestBody: Record<string, unknown> = { title, head, base };
        if (body !== undefined) requestBody.body = body;
        if (draft !== undefined) requestBody.draft = draft;
        if (maintainerCanModify !== undefined)
          requestBody.maintainer_can_modify = maintainerCanModify;
        const response = await ctx.client.post(
          `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls`,
          requestBody,
          { headers: GITHUB_API_VERSION_HEADER }
        );
        return response.data;
      },
    },

    mergePullRequest: {
      isTool: true,
      scope: 'destroy',
      description:
        'Merge an open pull request. Returns the merge commit SHA and a confirmation message. Fails if the PR is not mergeable.',
      input: MergePullRequestInputSchema,
      handler: async (ctx, input: MergePullRequestInput) => {
        const { owner, repo, pullNumber, commitTitle, commitMessage, mergeMethod } = input;
        const requestBody: Record<string, unknown> = { merge_method: mergeMethod };
        if (commitTitle !== undefined) requestBody.commit_title = commitTitle;
        if (commitMessage !== undefined) requestBody.commit_message = commitMessage;
        const response = await ctx.client.put(
          `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
            repo
          )}/pulls/${pullNumber}/merge`,
          requestBody,
          { headers: GITHUB_API_VERSION_HEADER }
        );
        return response.data;
      },
    },

    addLabels: {
      isTool: true,
      scope: 'write',
      description:
        'Add one or more labels to an issue or pull request. Labels are added without removing existing ones. Returns the full updated label list.',
      input: AddLabelsInputSchema,
      handler: async (ctx, input: AddLabelsInput) => {
        const { owner, repo, issueNumber, labels } = input;
        const response = await ctx.client.post(
          `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
            repo
          )}/issues/${issueNumber}/labels`,
          { labels },
          { headers: GITHUB_API_VERSION_HEADER }
        );
        return response.data;
      },
    },

    addAssignee: {
      isTool: true,
      scope: 'write',
      description:
        'Add one or more assignees to an issue or pull request. Assignees are added without removing existing ones.',
      input: AddAssigneeInputSchema,
      handler: async (ctx, input: AddAssigneeInput) => {
        const { owner, repo, issueNumber, assignees } = input;
        const response = await ctx.client.post(
          `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
            repo
          )}/issues/${issueNumber}/assignees`,
          { assignees },
          { headers: GITHUB_API_VERSION_HEADER }
        );
        return response.data;
      },
    },

    createBranch: {
      isTool: true,
      scope: 'write',
      description:
        'Create a new branch (git ref) in a repository. The ref must start with "refs/heads/". Use getCommit or listCommits to find a valid SHA.',
      input: CreateBranchInputSchema,
      handler: async (ctx, input: CreateBranchInput) => {
        const { owner, repo, ref, sha } = input;
        const response = await ctx.client.post(
          `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
            repo
          )}/git/refs`,
          { ref, sha },
          { headers: GITHUB_API_VERSION_HEADER }
        );
        return response.data;
      },
    },

    createOrUpdateFile: {
      isTool: true,
      scope: 'destroy',
      description:
        'Create or update a single file in a repository. The content must be Base64-encoded. To update an existing file, provide the current file blob SHA (get it via getFileContents). Returns the commit and file metadata.',
      input: CreateOrUpdateFileInputSchema,
      handler: async (ctx, input: CreateOrUpdateFileInput) => {
        const { owner, repo, path, message, content, sha, branch } = input;
        const requestBody: Record<string, unknown> = { message, content };
        if (sha !== undefined) requestBody.sha = sha;
        if (branch !== undefined) requestBody.branch = branch;
        const response = await ctx.client.put(
          `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
            repo
          )}/contents/${path.split('/').map(encodeURIComponent).join('/')}`,
          requestBody,
          { headers: GITHUB_API_VERSION_HEADER }
        );
        return response.data;
      },
    },

    updatePullRequest: {
      isTool: true,
      scope: 'destroy',
      description:
        'Update an open pull request (title, body, state, base branch, or maintainer permissions). At least one field must be provided. To close a PR set state to "closed".',
      input: UpdatePullRequestInputSchema,
      handler: async (ctx, input: UpdatePullRequestInput) => {
        const { owner, repo, pullNumber, title, body, state, base, maintainerCanModify } = input;
        const requestBody: Record<string, unknown> = {};
        if (title !== undefined) requestBody.title = title;
        if (body !== undefined) requestBody.body = body;
        if (state !== undefined) requestBody.state = state;
        if (base !== undefined) requestBody.base = base;
        if (maintainerCanModify !== undefined)
          requestBody.maintainer_can_modify = maintainerCanModify;
        const response = await ctx.client.patch(
          `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
            repo
          )}/pulls/${pullNumber}`,
          requestBody,
          { headers: GITHUB_API_VERSION_HEADER }
        );
        return response.data;
      },
    },

    requestReviewers: {
      isTool: true,
      scope: 'write',
      description:
        'Request one or more reviewers (individuals or teams) on a pull request. Reviewers are added without removing existing requests. Returns the updated PR. Note: GitHub rejects requests where a reviewer is the same user as the PR author with a 422 error — do not request the authenticated user as a reviewer on their own PR.',
      input: RequestReviewersInputSchema,
      handler: async (ctx, input: RequestReviewersInput) => {
        const { owner, repo, pullNumber, reviewers, teamReviewers } = input;
        const requestBody: Record<string, unknown> = {};
        if (reviewers !== undefined) requestBody.reviewers = reviewers;
        if (teamReviewers !== undefined) requestBody.team_reviewers = teamReviewers;
        const response = await ctx.client.post(
          `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
            repo
          )}/pulls/${pullNumber}/requested_reviewers`,
          requestBody,
          { headers: GITHUB_API_VERSION_HEADER }
        );
        return response.data;
      },
    },

    triggerWorkflow: {
      isTool: true,
      scope: 'write',
      description:
        'Trigger a workflow_dispatch event for a GitHub Actions workflow. The workflow must have a workflow_dispatch trigger defined in its YAML. Returns nothing on success (HTTP 204).',
      input: TriggerWorkflowInputSchema,
      handler: async (ctx, input: TriggerWorkflowInput) => {
        const { owner, repo, workflowId, ref, inputs } = input;
        const requestBody: Record<string, unknown> = { ref };
        if (inputs !== undefined) requestBody.inputs = inputs;
        await ctx.client.post(
          `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
            repo
          )}/actions/workflows/${encodeURIComponent(workflowId)}/dispatches`,
          requestBody,
          { headers: GITHUB_API_VERSION_HEADER }
        );
        return { ok: true };
      },
    },

    listTools: {
      isTool: true,
      scope: 'read',
      description:
        'List all tools available on the GitHub MCP server. Use this to discover available capabilities or refresh tool context for the LLM.',
      input: ListToolsInputSchema,
      handler: async (ctx) => {
        return withMcpClient(ctx, async (mcp) => {
          const { tools } = await mcp.listTools();
          return tools;
        });
      },
    },

    callTool: {
      isTool: true,
      scope: 'destroy',
      description:
        'Call any tool on the GitHub MCP server directly by name. Use this as an escape hatch when a specific tool is not yet exposed as a named action.',
      input: CallToolInputSchema,
      handler: async (ctx, input: CallToolInput) => {
        return callToolContent(ctx, input.name, input.arguments);
      },
    },

    graphqlQuery: {
      isTool: false,
      description:
        'Execute a read-only GitHub GraphQL query for workflow ingest. Mutations and subscriptions are rejected. Returns data, pageInfo (when present), rateLimit, and shouldBackoff.',
      input: GraphqlQueryInputSchema,
      handler: async (ctx, input: GraphqlQueryInput) => {
        return executeGitHubGraphQL({
          ctx,
          body: {
            query: input.query,
            variables: input.variables,
            operationName: input.operationName,
          },
        });
      },
    },

    runQueryTemplate: {
      isTool: false,
      description:
        'Run a named read-only GitHub GraphQL query template for workflow ingest. Use listQueryTemplates to discover templates such as orgCatalog.repos and activity.searchIssues.',
      input: RunQueryTemplateInputSchema,
      handler: async (ctx, input: RunQueryTemplateInput) => {
        const template = getGitHubQueryTemplate(input.templateId);
        return executeGitHubGraphQL({
          ctx,
          body: {
            query: template.query,
            variables: mergeTemplateVariables(input),
          },
          pageInfoPath: template.pageInfoPath,
          templateId: template.id,
        });
      },
    },

    listQueryTemplates: {
      isTool: false,
      description:
        'List read-only GitHub GraphQL query templates available for runQueryTemplate ingest workflows.',
      input: ListQueryTemplatesInputSchema,
      handler: async () => {
        return { templates: listGitHubQueryTemplates() };
      },
    },
  },

  test: {
    enabled: true,
    description: i18n.translate('connectorSpecs.github.test.description', {
      defaultMessage:
        'Verifies MCP connectivity and GitHub GraphQL API access for ingest workflows.',
    }),
    handler: async (ctx) => {
      const mcpResult = await withMcpClient(ctx, async (mcp) => {
        const { tools } = await mcp.listTools();
        return tools.length;
      });

      const graphqlResult = await executeGitHubGraphQL<{ viewer?: { login?: string } }>({
        ctx,
        body: {
          query: 'query GitHubConnectorTest { viewer { login } }',
        },
      });

      const login = graphqlResult.data.viewer?.login ?? 'unknown';

      return {
        message: `Connected to GitHub MCP (${mcpResult} tools) and GraphQL API (viewer: ${login}).`,
        mcpToolCount: mcpResult,
        graphqlViewer: login,
        rateLimit: graphqlResult.rateLimit,
      };
    },
  },

  skill: [
    'Action strategy guide:',
    '- Parameter names are camelCase. Use the exact names shown (e.g. issueNumber, pullNumber, workflowId) — never snake_case equivalents like issue_number or pull_number.',
    '- Start with getMe to identify the authenticated user.',
    '- For broad discovery: use search* actions (searchCode, searchRepositories, searchIssues, searchPullRequests, searchUsers).',
    '- For browsing a specific repo: use list* actions (listIssues, listPullRequests, listCommits, listBranches, listReleases, listTags). All use cursor-based pagination via "first" + "after". Optional updatedSince filters incremental list* calls.',
    '- For specific details: use get* actions (getIssue, getIssueComments, pullRequestRead, getCommit, getLatestRelease, getFileContents). pullRequestRead supports get_reviews for submitted reviews.',
    '- For workflow ingest at org scale: use runQueryTemplate (orgCatalog.*, activity.*, graph.*) or graphqlQuery for custom read-only GraphQL. These actions are not exposed to agents.',
    '- Write actions (require write permission on the repo):',
    '  - Issues: createIssue, updateIssue, addIssueComment, addLabels, addAssignee.',
    '  - Pull requests: createPullRequest, updatePullRequest, mergePullRequest, requestReviewers.',
    '  - Repo management: createBranch (SHA from listCommits or getCommit), createOrUpdateFile (content must be Base64-encoded), triggerWorkflow.',
    '- createOrUpdateFile requires the current blob SHA when updating an existing file; fetch it first with getFileContents.',
    '- For capabilities not yet exposed as named actions: listTools to discover, callTool to invoke.',
  ].join('\n'),
};
