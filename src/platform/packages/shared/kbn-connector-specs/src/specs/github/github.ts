/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * GitHub MCP Connector (v2)
 *
 * An MCP-native v2 connector that connects to the GitHub Copilot MCP server.
 *
 * Auth: Bearer token (PAT or OAuth token)
 */

import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import { UISchemas, type ActionContext, type ConnectorSpec } from '../../connector_spec';
import { withMcpClient } from '../../lib/mcp';
import type {
  CallToolInput,
  GetCommitInput,
  GetFileContentsInput,
  GetIssueCommentsInput,
  GetIssueInput,
  GetLatestReleaseInput,
  ListBranchesInput,
  ListCommitsInput,
  ListIssuesInput,
  ListPullRequestsInput,
  ListReleasesInput,
  ListTagsInput,
  PullRequestReadInput,
  SearchCodeInput,
  SearchIssuesInput,
  SearchPullRequestsInput,
  SearchRepositoriesInput,
  SearchUsersInput,
} from './types';
import {
  GetMeInputSchema,
  ListToolsInputSchema,
  SearchCodeInputSchema,
  SearchRepositoriesInputSchema,
  SearchIssuesInputSchema,
  SearchPullRequestsInputSchema,
  SearchUsersInputSchema,
  ListIssuesInputSchema,
  ListPullRequestsInputSchema,
  ListCommitsInputSchema,
  ListBranchesInputSchema,
  ListReleasesInputSchema,
  ListTagsInputSchema,
  GetCommitInputSchema,
  GetLatestReleaseInputSchema,
  PullRequestReadInputSchema,
  GetFileContentsInputSchema,
  GetIssueInputSchema,
  GetIssueCommentsInputSchema,
  CallToolInputSchema,
} from './types';

const GITHUB_MCP_SERVER_URL = 'https://api.githubcopilot.com/mcp/';

const parseJsonTextFromContentParts = (
  content: Array<{ type: string; text?: string }>
): unknown => {
  const text = content
    .filter((part) => part.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text)
    .join('\n');

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const callToolContent = async (
  ctx: ActionContext,
  toolName: string,
  args?: Record<string, unknown>
) => {
  return withMcpClient(ctx, async (mcp) => {
    const result = await mcp.callTool({ name: toolName, arguments: args ?? {} });
    return result.content;
  });
};

const callToolJson = async (
  ctx: ActionContext,
  toolName: string,
  args: Record<string, unknown> = {}
): Promise<unknown> => {
  return withMcpClient(ctx, async (mcp) => {
    const result = await mcp.callTool({ name: toolName, arguments: args });
    return parseJsonTextFromContentParts(result.content);
  });
};

export const GithubConnector: ConnectorSpec = {
  metadata: {
    id: '.github',
    displayName: 'GitHub',
    description: i18n.translate('core.kibanaConnectorSpecs.github.metadata.description', {
      defaultMessage:
        'Search repositories, issues, and pull requests, browse file contents, and list branches in GitHub',
    }),
    minimumLicense: 'enterprise',
    supportedFeatureIds: ['workflows', 'agentBuilder'],
  },

  auth: {
    types: ['bearer'],
    headers: {
      Accept: 'application/vnd.github+json',
    },
  },

  schema: z.object({
    serverUrl: UISchemas.url()
      .default(GITHUB_MCP_SERVER_URL)
      .describe('GitHub MCP Server URL')
      .meta({
        widget: 'text',
        placeholder: 'https://api.githubcopilot.com/mcp/',
        label: i18n.translate('connectorSpecs.github.config.serverUrl.label', {
          defaultMessage: 'MCP Server URL',
        }),
        helpText: i18n.translate('connectorSpecs.github.config.serverUrl.helpText', {
          defaultMessage: 'The URL of the GitHub Copilot MCP server.',
        }),
      }),
  }),

  validateUrls: {
    fields: ['serverUrl'],
  },

  actions: {
    getMe: {
      isTool: true,
      description: i18n.translate('connectorSpecs.github.actions.getMe.description', {
        defaultMessage: 'Get the authenticated GitHub user profile.',
      }),
      input: GetMeInputSchema,
      handler: async (ctx) => {
        return callToolJson(ctx, 'get_me');
      },
    },

    searchCode: {
      isTool: true,
      description: i18n.translate('connectorSpecs.github.actions.searchCode.description', {
        defaultMessage: 'Search for code across GitHub repositories.',
      }),
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
      description: i18n.translate('connectorSpecs.github.actions.searchRepositories.description', {
        defaultMessage: 'Search for GitHub repositories.',
      }),
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
      description: i18n.translate('connectorSpecs.github.actions.searchIssues.description', {
        defaultMessage: 'Search for issues across GitHub repositories.',
      }),
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
      description: i18n.translate('connectorSpecs.github.actions.searchPullRequests.description', {
        defaultMessage: 'Search for pull requests across GitHub repositories.',
      }),
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
      description: i18n.translate('connectorSpecs.github.actions.searchUsers.description', {
        defaultMessage: 'Search for GitHub users.',
      }),
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
      description: i18n.translate('connectorSpecs.github.actions.listIssues.description', {
        defaultMessage: 'List issues in a GitHub repository. Uses cursor-based pagination.',
      }),
      input: ListIssuesInputSchema,
      handler: async (ctx, input: ListIssuesInput) => {
        return callToolJson(ctx, 'list_issues', {
          owner: input.owner,
          repo: input.repo,
          state: input.state,
          first: input.first,
          after: input.after,
        });
      },
    },

    listPullRequests: {
      isTool: true,
      description: i18n.translate('connectorSpecs.github.actions.listPullRequests.description', {
        defaultMessage: 'List pull requests in a GitHub repository. Uses cursor-based pagination.',
      }),
      input: ListPullRequestsInputSchema,
      handler: async (ctx, input: ListPullRequestsInput) => {
        return callToolJson(ctx, 'list_pull_requests', {
          owner: input.owner,
          repo: input.repo,
          state: input.state,
          first: input.first,
          after: input.after,
        });
      },
    },

    listCommits: {
      isTool: true,
      description: i18n.translate('connectorSpecs.github.actions.listCommits.description', {
        defaultMessage: 'List commits in a GitHub repository. Uses cursor-based pagination.',
      }),
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
      description: i18n.translate('connectorSpecs.github.actions.listBranches.description', {
        defaultMessage: 'List branches in a GitHub repository. Uses cursor-based pagination.',
      }),
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
      description: i18n.translate('connectorSpecs.github.actions.listReleases.description', {
        defaultMessage: 'List releases in a GitHub repository. Uses cursor-based pagination.',
      }),
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
      description: i18n.translate('connectorSpecs.github.actions.listTags.description', {
        defaultMessage: 'List tags in a GitHub repository. Uses cursor-based pagination.',
      }),
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
      description: i18n.translate('connectorSpecs.github.actions.getCommit.description', {
        defaultMessage: 'Get details of a specific commit.',
      }),
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
      description: i18n.translate('connectorSpecs.github.actions.getLatestRelease.description', {
        defaultMessage: 'Get the latest release of a GitHub repository.',
      }),
      input: GetLatestReleaseInputSchema,
      handler: async (ctx, input: GetLatestReleaseInput) => {
        return callToolJson(ctx, 'get_latest_release', { owner: input.owner, repo: input.repo });
      },
    },

    pullRequestRead: {
      isTool: true,
      description: i18n.translate('connectorSpecs.github.actions.pullRequestRead.description', {
        defaultMessage: 'Read the full details of a specific pull request.',
      }),
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
      description: i18n.translate('connectorSpecs.github.actions.getFileContents.description', {
        defaultMessage: 'Get the contents of a file or directory from a GitHub repository.',
      }),
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
      description: i18n.translate('connectorSpecs.github.actions.getIssue.description', {
        defaultMessage: 'Get details of a specific issue in a GitHub repository.',
      }),
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
      description: i18n.translate('connectorSpecs.github.actions.getIssueComments.description', {
        defaultMessage: 'Get comments for a specific issue in a GitHub repository.',
      }),
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

    listTools: {
      isTool: true,
      description: i18n.translate('connectorSpecs.github.actions.listTools.description', {
        defaultMessage:
          'List all tools available on the GitHub MCP server. Use this to discover available capabilities or refresh tool context for the LLM.',
      }),
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
      description: i18n.translate('connectorSpecs.github.actions.callTool.description', {
        defaultMessage:
          'Call any tool on the GitHub MCP server directly by name. Use this as an escape hatch when a specific tool is not yet exposed as a named action.',
      }),
      input: CallToolInputSchema,
      handler: async (ctx, input: CallToolInput) => {
        return callToolContent(ctx, input.name, input.arguments);
      },
    },
  },

  test: {
    description: i18n.translate('connectorSpecs.github.test.description', {
      defaultMessage:
        'Verifies connection to the GitHub Copilot MCP server by listing available tools.',
    }),
    handler: async (ctx) => {
      return withMcpClient(ctx, async (mcp) => {
        const { tools } = await mcp.listTools();
        return {
          ok: true,
          message: `Connected to GitHub MCP server. ${tools.length} tools available.`,
        };
      });
    },
  },
};
