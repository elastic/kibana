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
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import type { ContentPart } from '@kbn/mcp-client';
import { createMcpClientFromAxios } from './create_mcp_client_from_axios';

const MCP_CLIENT_VERSION = '1.0.0';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Extracts text from MCP content parts and parses it as JSON.
 * Falls back to the raw string if parsing fails.
 */
const parseContent = (content: ContentPart[]): any => {
  const text = content
    .filter((part) => part.type === 'text' && part.text)
    .map((part) => part.text!)
    .join('\n');
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const compactRepo = (r: any) => ({
  name: r.full_name ?? r.name,
  description: r.description,
  url: r.html_url,
  language: r.language,
  stars: r.stargazers_count,
  updatedAt: r.updated_at,
});

const compactIssue = (i: any) => ({
  number: i.number,
  title: i.title,
  state: i.state,
  url: i.html_url,
  user: i.user?.login,
  labels: i.labels?.map((l: any) => l.name ?? l),
  createdAt: i.created_at,
  updatedAt: i.updated_at,
});

const compactPullRequest = (pr: any) => ({
  number: pr.number,
  title: pr.title,
  state: pr.state,
  url: pr.html_url,
  user: pr.user?.login,
  createdAt: pr.created_at,
  updatedAt: pr.updated_at,
  mergedAt: pr.merged_at,
});

const compactUser = (u: any) => ({
  login: u.login,
  url: u.html_url,
  type: u.type,
  avatarUrl: u.avatar_url,
});

const compactCodeResult = (c: any) => ({
  name: c.name,
  repository: c.repository?.full_name,
  url: c.html_url,
});

const compactCommit = (c: any) => ({
  sha: c.sha ?? c.oid,
  message: c.commit?.message ?? c.message ?? c.messageHeadline,
  author: c.commit?.author?.name ?? c.author?.login ?? c.author?.name,
  date: c.commit?.author?.date ?? c.committedDate ?? c.authoredDate,
  url: c.html_url ?? c.url,
});

const compactRelease = (r: any) => ({
  name: r.name,
  tagName: r.tag_name ?? r.tagName,
  publishedAt: r.published_at ?? r.publishedAt,
  url: r.html_url ?? r.url,
});

const compactBranch = (b: any) => ({
  name: b.name,
});

const compactTag = (t: any) => ({
  name: t.name,
});

/**
 * Wraps a GitHub search response, compacting each item with the provided mapper.
 */
const compactSearchResult = (raw: any, mapper: (item: any) => any) => ({
  totalCount: raw.total_count ?? raw.totalCount,
  items: (raw.items ?? []).map(mapper),
});

/**
 * Wraps a cursor-paginated list response, compacting each item.
 * The MCP server may return pageInfo for cursor navigation.
 */
const compactListResult = (raw: any, mapper: (item: any) => any) => {
  const items = Array.isArray(raw) ? raw : raw.items ?? raw.nodes ?? raw.data ?? [];
  return {
    items: items.map(mapper),
    ...(raw.pageInfo ? { pageInfo: raw.pageInfo } : {}),
    ...(raw.totalCount != null ? { totalCount: raw.totalCount } : {}),
  };
};

/**
 * Lifecycle helper: creates an MCP client from the connector's Axios instance,
 * connects, runs the callback, and disconnects. Every action call gets a fresh
 * MCP session (connect-per-action pattern).
 */
const withMcpClient = async <T>(
  ctx: ActionContext,
  fn: (mcp: ReturnType<typeof createMcpClientFromAxios>) => Promise<T>
): Promise<T> => {
  const serverUrl = (ctx.config?.serverUrl as string) ?? '';
  if (!serverUrl) {
    throw new Error('config.serverUrl is required');
  }
  const mcpClient = createMcpClientFromAxios({
    logger: ctx.log,
    axiosInstance: ctx.client,
    url: serverUrl,
    name: `kibana-github-mcp-${serverUrl}`,
    version: MCP_CLIENT_VERSION,
  });
  try {
    await mcpClient.connect();
    return await fn(mcpClient);
  } finally {
    await mcpClient.disconnect();
  }
};

export const GithubMcpConnector: ConnectorSpec = {
  metadata: {
    id: '.github_mcp',
    displayName: 'GitHub (MCP)',
    description: i18n.translate('core.kibanaConnectorSpecs.githubMcp.metadata.description', {
      defaultMessage:
        'Connect to GitHub via the Copilot MCP server to search and read repositories, issues, pull requests, and more.',
    }),
    minimumLicense: 'enterprise',
    supportedFeatureIds: ['workflows'],
  },

  auth: {
    types: ['bearer'],
  },

  schema: z.object({
    serverUrl: z
      .string()
      .url()
      .default('https://api.githubcopilot.com/mcp/')
      .meta({
        label: i18n.translate('core.kibanaConnectorSpecs.githubMcp.config.serverUrl.label', {
          defaultMessage: 'MCP Server URL',
        }),
        helpText: i18n.translate('core.kibanaConnectorSpecs.githubMcp.config.serverUrl.helpText', {
          defaultMessage: 'The URL of the GitHub Copilot MCP server.',
        }),
      }),
  }),

  validateUrls: {
    fields: ['serverUrl'],
  },

  actions: {
    listTools: {
      isTool: true,
      description: i18n.translate(
        'core.kibanaConnectorSpecs.githubMcp.actions.listTools.description',
        { defaultMessage: 'List all available tools on the GitHub MCP server.' }
      ),
      input: z.object({}),
      output: z.object({
        tools: z.array(
          z.object({
            name: z.string(),
            description: z.string().optional(),
          })
        ),
      }),
      handler: async (ctx) => {
        return withMcpClient(ctx, async (mcp) => {
          const { tools } = await mcp.listTools();
          return { tools: tools.map(({ name, description }) => ({ name, description })) };
        });
      },
    },

    getMe: {
      isTool: true,
      description: i18n.translate(
        'core.kibanaConnectorSpecs.githubMcp.actions.getMe.description',
        { defaultMessage: 'Get the authenticated GitHub user profile.' }
      ),
      input: z.object({}),
      handler: async (ctx) => {
        return withMcpClient(ctx, async (mcp) => {
          const result = await mcp.callTool({ name: 'get_me' });
          const raw = parseContent(result.content);
          return {
            login: raw.login,
            name: raw.name,
            email: raw.email,
            url: raw.html_url,
            bio: raw.bio,
          };
        });
      },
    },

    searchCode: {
      isTool: true,
      description: i18n.translate(
        'core.kibanaConnectorSpecs.githubMcp.actions.searchCode.description',
        { defaultMessage: 'Search for code across GitHub repositories.' }
      ),
      input: z.object({
        query: z.string().min(1).describe('GitHub code search query'),
        page: z.number().default(1).optional(),
        perPage: z.number().default(10).optional(),
      }),
      handler: async (ctx, input) => {
        return withMcpClient(ctx, async (mcp) => {
          const result = await mcp.callTool({
            name: 'search_code',
            arguments: { query: input.query, page: input.page, perPage: input.perPage },
          });
          return compactSearchResult(parseContent(result.content), compactCodeResult);
        });
      },
    },

    searchRepositories: {
      isTool: true,
      description: i18n.translate(
        'core.kibanaConnectorSpecs.githubMcp.actions.searchRepositories.description',
        { defaultMessage: 'Search for GitHub repositories.' }
      ),
      input: z.object({
        query: z.string().min(1).describe('GitHub repository search query'),
        page: z.number().default(1).optional(),
        perPage: z.number().default(10).optional(),
      }),
      handler: async (ctx, input) => {
        return withMcpClient(ctx, async (mcp) => {
          const result = await mcp.callTool({
            name: 'search_repositories',
            arguments: { query: input.query, page: input.page, perPage: input.perPage },
          });
          return compactSearchResult(parseContent(result.content), compactRepo);
        });
      },
    },

    searchIssues: {
      isTool: true,
      description: i18n.translate(
        'core.kibanaConnectorSpecs.githubMcp.actions.searchIssues.description',
        { defaultMessage: 'Search for issues across GitHub repositories.' }
      ),
      input: z.object({
        query: z.string().min(1).describe('GitHub issue search query'),
        order: z.enum(['asc', 'desc']).default('desc').optional(),
        sort: z.string().default('created').optional(),
        page: z.number().default(1).optional(),
        perPage: z.number().default(10).optional(),
      }),
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
          return compactSearchResult(parseContent(result.content), compactIssue);
        });
      },
    },

    searchPullRequests: {
      isTool: true,
      description: i18n.translate(
        'core.kibanaConnectorSpecs.githubMcp.actions.searchPullRequests.description',
        { defaultMessage: 'Search for pull requests across GitHub repositories.' }
      ),
      input: z.object({
        query: z.string().min(1).describe('GitHub pull request search query'),
        order: z.enum(['asc', 'desc']).default('desc').optional(),
        sort: z.string().default('created').optional(),
        page: z.number().default(1).optional(),
        perPage: z.number().default(10).optional(),
      }),
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
          return compactSearchResult(parseContent(result.content), compactPullRequest);
        });
      },
    },

    searchUsers: {
      isTool: true,
      description: i18n.translate(
        'core.kibanaConnectorSpecs.githubMcp.actions.searchUsers.description',
        { defaultMessage: 'Search for GitHub users.' }
      ),
      input: z.object({
        query: z.string().min(1).describe('GitHub user search query'),
        page: z.number().default(1).optional(),
        perPage: z.number().default(10).optional(),
      }),
      handler: async (ctx, input) => {
        return withMcpClient(ctx, async (mcp) => {
          const result = await mcp.callTool({
            name: 'search_users',
            arguments: { query: input.query, page: input.page, perPage: input.perPage },
          });
          return compactSearchResult(parseContent(result.content), compactUser);
        });
      },
    },

    listIssues: {
      isTool: true,
      description: i18n.translate(
        'core.kibanaConnectorSpecs.githubMcp.actions.listIssues.description',
        { defaultMessage: 'List issues in a GitHub repository. Uses cursor-based pagination.' }
      ),
      input: z.object({
        owner: z.string().min(1).describe('Repository owner (user or org)'),
        repo: z.string().min(1).describe('Repository name'),
        state: z.enum(['open', 'closed', 'all']).default('open').optional(),
        first: z.number().default(10).optional().describe('Number of results to return'),
        after: z
          .string()
          .optional()
          .describe('Cursor for pagination (endCursor from previous response)'),
      }),
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
          // return compactListResult(parseContent(result.content), compactIssue);
          return result.content;
        });
      },
    },

    listPullRequests: {
      isTool: true,
      description: i18n.translate(
        'core.kibanaConnectorSpecs.githubMcp.actions.listPullRequests.description',
        {
          defaultMessage:
            'List pull requests in a GitHub repository. Uses cursor-based pagination.',
        }
      ),
      input: z.object({
        owner: z.string().min(1).describe('Repository owner (user or org)'),
        repo: z.string().min(1).describe('Repository name'),
        state: z.enum(['open', 'closed', 'all']).default('open').optional(),
        first: z.number().default(10).optional().describe('Number of results to return'),
        after: z
          .string()
          .optional()
          .describe('Cursor for pagination (endCursor from previous response)'),
      }),
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
          return compactListResult(parseContent(result.content), compactPullRequest);
        });
      },
    },

    listCommits: {
      isTool: true,
      description: i18n.translate(
        'core.kibanaConnectorSpecs.githubMcp.actions.listCommits.description',
        { defaultMessage: 'List commits in a GitHub repository. Uses cursor-based pagination.' }
      ),
      input: z.object({
        owner: z.string().min(1).describe('Repository owner (user or org)'),
        repo: z.string().min(1).describe('Repository name'),
        sha: z.string().optional().describe('Branch name or commit SHA to start listing from'),
        first: z.number().default(10).optional().describe('Number of results to return'),
        after: z
          .string()
          .optional()
          .describe('Cursor for pagination (endCursor from previous response)'),
      }),
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
          return compactListResult(parseContent(result.content), compactCommit);
        });
      },
    },

    listBranches: {
      isTool: true,
      description: i18n.translate(
        'core.kibanaConnectorSpecs.githubMcp.actions.listBranches.description',
        { defaultMessage: 'List branches in a GitHub repository. Uses cursor-based pagination.' }
      ),
      input: z.object({
        owner: z.string().min(1).describe('Repository owner (user or org)'),
        repo: z.string().min(1).describe('Repository name'),
        first: z.number().default(10).optional().describe('Number of results to return'),
        after: z
          .string()
          .optional()
          .describe('Cursor for pagination (endCursor from previous response)'),
      }),
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
          return compactListResult(parseContent(result.content), compactBranch);
        });
      },
    },

    listReleases: {
      isTool: true,
      description: i18n.translate(
        'core.kibanaConnectorSpecs.githubMcp.actions.listReleases.description',
        { defaultMessage: 'List releases in a GitHub repository. Uses cursor-based pagination.' }
      ),
      input: z.object({
        owner: z.string().min(1).describe('Repository owner (user or org)'),
        repo: z.string().min(1).describe('Repository name'),
        first: z.number().default(10).optional().describe('Number of results to return'),
        after: z
          .string()
          .optional()
          .describe('Cursor for pagination (endCursor from previous response)'),
      }),
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
          return compactListResult(parseContent(result.content), compactRelease);
        });
      },
    },

    listTags: {
      isTool: true,
      description: i18n.translate(
        'core.kibanaConnectorSpecs.githubMcp.actions.listTags.description',
        { defaultMessage: 'List tags in a GitHub repository. Uses cursor-based pagination.' }
      ),
      input: z.object({
        owner: z.string().min(1).describe('Repository owner (user or org)'),
        repo: z.string().min(1).describe('Repository name'),
        first: z.number().default(10).optional().describe('Number of results to return'),
        after: z
          .string()
          .optional()
          .describe('Cursor for pagination (endCursor from previous response)'),
      }),
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
          return compactListResult(parseContent(result.content), compactTag);
        });
      },
    },

    getCommit: {
      isTool: true,
      description: i18n.translate(
        'core.kibanaConnectorSpecs.githubMcp.actions.getCommit.description',
        { defaultMessage: 'Get details of a specific commit.' }
      ),
      input: z.object({
        owner: z.string().min(1).describe('Repository owner (user or org)'),
        repo: z.string().min(1).describe('Repository name'),
        sha: z.string().min(1).describe('Commit SHA'),
      }),
      handler: async (ctx, input) => {
        return withMcpClient(ctx, async (mcp) => {
          const result = await mcp.callTool({
            name: 'get_commit',
            arguments: { owner: input.owner, repo: input.repo, sha: input.sha },
          });
          return compactCommit(parseContent(result.content));
        });
      },
    },

    getLatestRelease: {
      isTool: true,
      description: i18n.translate(
        'core.kibanaConnectorSpecs.githubMcp.actions.getLatestRelease.description',
        { defaultMessage: 'Get the latest release of a GitHub repository.' }
      ),
      input: z.object({
        owner: z.string().min(1).describe('Repository owner (user or org)'),
        repo: z.string().min(1).describe('Repository name'),
      }),
      handler: async (ctx, input) => {
        return withMcpClient(ctx, async (mcp) => {
          const result = await mcp.callTool({
            name: 'get_latest_release',
            arguments: { owner: input.owner, repo: input.repo },
          });
          return compactRelease(parseContent(result.content));
        });
      },
    },

    pullRequestRead: {
      isTool: true,
      description: i18n.translate(
        'core.kibanaConnectorSpecs.githubMcp.actions.pullRequestRead.description',
        { defaultMessage: 'Read the full details of a specific pull request.' }
      ),
      input: z.object({
        owner: z.string().min(1).describe('Repository owner (user or org)'),
        repo: z.string().min(1).describe('Repository name'),
        pullNumber: z.number().describe('Pull request number'),
      }),
      handler: async (ctx, input) => {
        return withMcpClient(ctx, async (mcp) => {
          const result = await mcp.callTool({
            name: 'pull_request_read',
            arguments: { owner: input.owner, repo: input.repo, pullNumber: input.pullNumber },
          });
          const raw = parseContent(result.content);
          return {
            number: raw.number,
            title: raw.title,
            state: raw.state,
            url: raw.html_url ?? raw.url,
            user: raw.user?.login,
            body: raw.body,
            createdAt: raw.created_at ?? raw.createdAt,
            updatedAt: raw.updated_at ?? raw.updatedAt,
            mergedAt: raw.merged_at ?? raw.mergedAt,
            labels: raw.labels?.map((l: any) => l.name ?? l),
          };
        });
      },
    },
  },

  test: {
    description: i18n.translate('core.kibanaConnectorSpecs.githubMcp.test.description', {
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
