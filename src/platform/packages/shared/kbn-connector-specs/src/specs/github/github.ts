/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * GitHub MCP Connector (v2)
 *
 * An MCP-native v2 connector that connects to the GitHub Copilot MCP server.
 * Uses Mike's Axios-based approach: the framework's ctx.client (Axios) is
 * wrapped as a fetch adapter and passed to McpClient, so auth/SSL/proxy
 * come from Axios for free. No client registry needed.
 *
 * Auth: Bearer token (PAT or OAuth token)
 * Transport: Axios → createFetchFromAxios → StreamableHTTPClientTransport
 */

import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import { UISchemas, type ConnectorSpec } from '../../connector_spec';
import { withMcpClient } from '../../lib/mcp';
import {
  GetMeInputSchema,
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

export const GithubConnector: ConnectorSpec = {
  metadata: {
    id: '.github',
    displayName: 'GitHub',
    description: i18n.translate('connectorSpecs.github.metadata.description', {
      defaultMessage:
        'Connect to GitHub via the Copilot MCP server to search and read repositories, issues, pull requests, and more.',
    }),
    minimumLicense: 'enterprise',
    supportedFeatureIds: ['workflows', 'agentBuilder'],
  },

  auth: {
    types: [
      'bearer'
    ],
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
        return withMcpClient(ctx, async (mcp) => {
          const result = await mcp.callTool({ name: 'get_me' });
          return result.content;
        });
      },
    },

    searchCode: {
      isTool: true,
      description: i18n.translate('connectorSpecs.github.actions.searchCode.description', {
        defaultMessage: 'Search for code across GitHub repositories.',
      }),
      input: SearchCodeInputSchema,
      handler: async (ctx, input) => {
        return withMcpClient(ctx, async (mcp) => {
          const result = await mcp.callTool({
            name: 'search_code',
            arguments: { query: input.query, page: input.page, perPage: input.perPage },
          });
          return result.content;
        });
      },
    },

    searchRepositories: {
      isTool: true,
      description: i18n.translate(
        'connectorSpecs.github.actions.searchRepositories.description',
        { defaultMessage: 'Search for GitHub repositories.' }
      ),
      input: SearchRepositoriesInputSchema,
      handler: async (ctx, input) => {
        return withMcpClient(ctx, async (mcp) => {
          const result = await mcp.callTool({
            name: 'search_repositories',
            arguments: { query: input.query, page: input.page, perPage: input.perPage },
          });
          return result.content;
        });
      },
    },

    searchIssues: {
      isTool: true,
      description: i18n.translate('connectorSpecs.github.actions.searchIssues.description', {
        defaultMessage: 'Search for issues across GitHub repositories.',
      }),
      input: SearchIssuesInputSchema,
      handler: async (ctx, input) => {
        return withMcpClient(ctx, async (mcp) => {
          const result = await mcp.callTool({
            name: 'search_issues',
            arguments: {
              query: input.query,
              order: input.order,
              sort: input.sort,
              page: input.page,
              perPage: input.perPage,
            },
          });
          return result.content;
        });
      },
    },

    searchPullRequests: {
      isTool: true,
      description: i18n.translate(
        'connectorSpecs.github.actions.searchPullRequests.description',
        { defaultMessage: 'Search for pull requests across GitHub repositories.' }
      ),
      input: SearchPullRequestsInputSchema,
      handler: async (ctx, input) => {
        return withMcpClient(ctx, async (mcp) => {
          const result = await mcp.callTool({
            name: 'search_pull_requests',
            arguments: {
              query: input.query,
              order: input.order,
              sort: input.sort,
              page: input.page,
              perPage: input.perPage,
            },
          });
          return result.content;
        });
      },
    },

    searchUsers: {
      isTool: true,
      description: i18n.translate('connectorSpecs.github.actions.searchUsers.description', {
        defaultMessage: 'Search for GitHub users.',
      }),
      input: SearchUsersInputSchema,
      handler: async (ctx, input) => {
        return withMcpClient(ctx, async (mcp) => {
          const result = await mcp.callTool({
            name: 'search_users',
            arguments: { query: input.query, page: input.page, perPage: input.perPage },
          });
          return result.content;
        });
      },
    },

    listIssues: {
      isTool: true,
      description: i18n.translate('connectorSpecs.github.actions.listIssues.description', {
        defaultMessage: 'List issues in a GitHub repository. Uses cursor-based pagination.',
      }),
      input: ListIssuesInputSchema,
      handler: async (ctx, input) => {
        return withMcpClient(ctx, async (mcp) => {
          const result = await mcp.callTool({
            name: 'list_issues',
            arguments: {
              owner: input.owner,
              repo: input.repo,
              state: input.state,
              first: input.first,
              after: input.after,
            },
          });
          return result.content;
        });
      },
    },

    listPullRequests: {
      isTool: true,
      description: i18n.translate(
        'connectorSpecs.github.actions.listPullRequests.description',
        {
          defaultMessage:
            'List pull requests in a GitHub repository. Uses cursor-based pagination.',
        }
      ),
      input: ListPullRequestsInputSchema,
      handler: async (ctx, input) => {
        return withMcpClient(ctx, async (mcp) => {
          const result = await mcp.callTool({
            name: 'list_pull_requests',
            arguments: {
              owner: input.owner,
              repo: input.repo,
              state: input.state,
              first: input.first,
              after: input.after,
            },
          });
          return result.content;
        });
      },
    },

    listCommits: {
      isTool: true,
      description: i18n.translate('connectorSpecs.github.actions.listCommits.description', {
        defaultMessage: 'List commits in a GitHub repository. Uses cursor-based pagination.',
      }),
      input: ListCommitsInputSchema,
      handler: async (ctx, input) => {
        return withMcpClient(ctx, async (mcp) => {
          const result = await mcp.callTool({
            name: 'list_commits',
            arguments: {
              owner: input.owner,
              repo: input.repo,
              sha: input.sha,
              first: input.first,
              after: input.after,
            },
          });
          return result.content;
        });
      },
    },

    listBranches: {
      isTool: true,
      description: i18n.translate('connectorSpecs.github.actions.listBranches.description', {
        defaultMessage: 'List branches in a GitHub repository. Uses cursor-based pagination.',
      }),
      input: ListBranchesInputSchema,
      handler: async (ctx, input) => {
        return withMcpClient(ctx, async (mcp) => {
          const result = await mcp.callTool({
            name: 'list_branches',
            arguments: {
              owner: input.owner,
              repo: input.repo,
              first: input.first,
              after: input.after,
            },
          });
          return result.content;
        });
      },
    },

    listReleases: {
      isTool: true,
      description: i18n.translate('connectorSpecs.github.actions.listReleases.description', {
        defaultMessage: 'List releases in a GitHub repository. Uses cursor-based pagination.',
      }),
      input: ListReleasesInputSchema,
      handler: async (ctx, input) => {
        return withMcpClient(ctx, async (mcp) => {
          const result = await mcp.callTool({
            name: 'list_releases',
            arguments: {
              owner: input.owner,
              repo: input.repo,
              first: input.first,
              after: input.after,
            },
          });
          return result.content;
        });
      },
    },

    listTags: {
      isTool: true,
      description: i18n.translate('connectorSpecs.github.actions.listTags.description', {
        defaultMessage: 'List tags in a GitHub repository. Uses cursor-based pagination.',
      }),
      input: ListTagsInputSchema,
      handler: async (ctx, input) => {
        return withMcpClient(ctx, async (mcp) => {
          const result = await mcp.callTool({
            name: 'list_tags',
            arguments: {
              owner: input.owner,
              repo: input.repo,
              first: input.first,
              after: input.after,
            },
          });
          return result.content;
        });
      },
    },

    getCommit: {
      isTool: true,
      description: i18n.translate('connectorSpecs.github.actions.getCommit.description', {
        defaultMessage: 'Get details of a specific commit.',
      }),
      input: GetCommitInputSchema,
      handler: async (ctx, input) => {
        return withMcpClient(ctx, async (mcp) => {
          const result = await mcp.callTool({
            name: 'get_commit',
            arguments: { owner: input.owner, repo: input.repo, sha: input.sha },
          });
          return result.content;
        });
      },
    },

    getLatestRelease: {
      isTool: true,
      description: i18n.translate(
        'connectorSpecs.github.actions.getLatestRelease.description',
        { defaultMessage: 'Get the latest release of a GitHub repository.' }
      ),
      input: GetLatestReleaseInputSchema,
      handler: async (ctx, input) => {
        return withMcpClient(ctx, async (mcp) => {
          const result = await mcp.callTool({
            name: 'get_latest_release',
            arguments: { owner: input.owner, repo: input.repo },
          });
          return result.content;
        });
      },
    },

    pullRequestRead: {
      isTool: true,
      description: i18n.translate('connectorSpecs.github.actions.pullRequestRead.description', {
        defaultMessage: 'Read the full details of a specific pull request.',
      }),
      input: PullRequestReadInputSchema,
      handler: async (ctx, input) => {
        return withMcpClient(ctx, async (mcp) => {
          const result = await mcp.callTool({
            name: 'pull_request_read',
            arguments: {
              owner: input.owner,
              repo: input.repo,
              pullNumber: input.pullNumber,
              method: input.method,
            },
          });
          return result.content;
        });
      },
    },

    getFileContents: {
      isTool: true,
      description: i18n.translate('connectorSpecs.github.actions.getFileContents.description', {
        defaultMessage: 'Get the contents of a file or directory from a GitHub repository.',
      }),
      input: GetFileContentsInputSchema,
      handler: async (ctx, input) => {
        return withMcpClient(ctx, async (mcp) => {
          const result = await mcp.callTool({
            name: 'get_file_contents',
            arguments: { owner: input.owner, repo: input.repo, path: input.path, ref: input.ref },
          });
          return result.content;
        });
      },
    },

    getIssue: {
      isTool: true,
      description: i18n.translate('connectorSpecs.github.actions.getIssue.description', {
        defaultMessage: 'Get details of a specific issue in a GitHub repository.',
      }),
      input: GetIssueInputSchema,
      handler: async (ctx, input) => {
        return withMcpClient(ctx, async (mcp) => {
          const result = await mcp.callTool({
            name: 'get_issue',
            arguments: { owner: input.owner, repo: input.repo, issueNumber: input.issueNumber },
          });
          return result.content;
        });
      },
    },

    getIssueComments: {
      isTool: true,
      description: i18n.translate('connectorSpecs.github.actions.getIssueComments.description', {
        defaultMessage: 'Get comments for a specific issue in a GitHub repository.',
      }),
      input: GetIssueCommentsInputSchema,
      handler: async (ctx, input) => {
        return withMcpClient(ctx, async (mcp) => {
          const result = await mcp.callTool({
            name: 'get_issue_comments',
            arguments: { owner: input.owner, repo: input.repo, issueNumber: input.issueNumber },
          });
          return result.content;
        });
      },
    },

    listTools: {
      isTool: true,
      description: i18n.translate('connectorSpecs.github.actions.listTools.description', {
        defaultMessage:
          'List all tools available on the GitHub MCP server. Use this to discover available capabilities or refresh tool context for the LLM.',
      }),
      input: z.object({}),
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
      handler: async (ctx, input) => {
        return withMcpClient(ctx, async (mcp) => {
          const result = await mcp.callTool({
            name: input.name,
            arguments: input.arguments,
          });
          return result.content;
        });
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
