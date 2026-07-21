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
import { z, lazySchema } from '@kbn/zod/v4';
import {
  UISchemas,
  type ActionContext,
  type ConnectorSpec,
  type SandboxCliToken,
} from '../../connector_spec';
import { withMcpClient, callToolContent, callToolJson } from '../../lib/mcp';
import { GithubAppTokenMinter } from './github_app_token_minter';
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
const GITHUB_APP_AUTH_TYPE = 'github_app';
const WORKSPACE = '/workspace';
const GIT_CREDENTIALS_PATH = `${WORKSPACE}/.git-credentials`;
const GH_CONFIG_DIR = `${WORKSPACE}/.config/gh`;
const GH_HOSTS_PATH = `${GH_CONFIG_DIR}/hosts.yml`;

const sandboxCliMintTokenInputSchema = lazySchema(() =>
  z.object({
    repository: z.string().optional(),
    gitRepos: z.array(z.string()).optional(),
    access: z.enum(['read', 'push-pr']).optional(),
    requireRequestedRepo: z.boolean().optional(),
  })
);

interface SandboxCliMintTokenInput {
  repository?: string;
  gitRepos?: string[];
  access?: 'read' | 'push-pr';
  requireRequestedRepo?: boolean;
}

type SandboxCliMintTokenResponse = SandboxCliToken;

const parseAllowedRepos = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string').map((v) => v.trim());
  }
  if (typeof value !== 'string') {
    return [];
  }
  return value
    .split(/[,\s]+/)
    .map((v) => v.trim())
    .filter(Boolean);
};

const normalizeRepo = (repo: string): string =>
  repo
    .trim()
    .replace(/\.git$/i, '')
    .toLowerCase();

const isRepoAllowed = (repo: string, allowedRepos: string[]): boolean => {
  const normalizedRepo = normalizeRepo(repo);
  return allowedRepos.some((allowed) => {
    const normalizedAllowed = normalizeRepo(allowed);
    if (normalizedAllowed.endsWith('/*')) {
      return normalizedRepo.startsWith(`${normalizedAllowed.slice(0, -1)}`);
    }
    return normalizedRepo === normalizedAllowed;
  });
};

const firstConcreteRepo = (repos: string[]): string | undefined =>
  repos.filter((repo) => !repo.endsWith('/*'))[0];

const uniqueRepos = (repos: string[]): string[] => [...new Set(repos.filter(Boolean))];

const formatRepoCandidates = (repos: string[]): string =>
  uniqueRepos(repos).length > 0 ? uniqueRepos(repos).join(', ') : 'none';

const describeSandboxGitAccess = async (ctx: ActionContext) => {
  const config = ctx.config as { allowedRepos?: string };
  return {
    allowedRepos: parseAllowedRepos(config.allowedRepos),
    supportsAccess: ['read', 'push-pr'],
  };
};

const buildGitHubSandboxToken = ({
  token,
  source,
  expiresAt,
}: {
  token: string;
  source: string;
  expiresAt?: number;
}): SandboxCliMintTokenResponse => ({
  source,
  expiresAt,
  env: {
    GIT_TERMINAL_PROMPT: '0',
    GIT_ASKPASS: '/bin/false',
    GH_CONFIG_DIR,
    GH_TOKEN: token,
    GITHUB_TOKEN: token,
  },
  files: [
    {
      path: GIT_CREDENTIALS_PATH,
      contents: `https://x-access-token:${token}@github.com\n`,
      mode: '0600',
    },
    {
      path: GH_HOSTS_PATH,
      contents: `github.com:\n  oauth_token: ${token}\n  git_protocol: https\n`,
      mode: '0600',
    },
  ],
  setupCommands: [
    `git config --global credential.helper 'store --file ${GIT_CREDENTIALS_PATH}'`,
    `mkdir -p "$HOME/.config/gh" && cp ${GH_HOSTS_PATH} "$HOME/.config/gh/hosts.yml" && chmod 0600 "$HOME/.config/gh/hosts.yml"`,
  ],
  cleanupPaths: [GIT_CREDENTIALS_PATH, GH_CONFIG_DIR, '$HOME/.config/gh/hosts.yml'],
});

const mintSandboxGitToken = async (
  ctx: ActionContext,
  input: SandboxCliMintTokenInput
): Promise<SandboxCliMintTokenResponse> => {
  const config = ctx.config as { allowedRepos?: string };
  const secrets = ctx.secrets;
  if (!secrets) {
    throw new Error('GitHub connector is missing secrets');
  }

  if (secrets.authType === 'bearer' && typeof secrets.token === 'string') {
    return buildGitHubSandboxToken({
      token: secrets.token,
      source: 'github_bearer_connector_token',
    });
  }

  if (secrets.authType !== GITHUB_APP_AUTH_TYPE) {
    throw new Error('GitHub sandbox git credentials require PAT or GitHub App auth');
  }

  const appId = typeof secrets.appId === 'string' ? secrets.appId : undefined;
  const privateKey = typeof secrets.privateKey === 'string' ? secrets.privateKey : undefined;
  if (!appId || !privateKey) {
    throw new Error('GitHub App connector is missing appId or privateKey');
  }

  const repos = input.gitRepos ?? [];
  const allowedRepos = parseAllowedRepos(config.allowedRepos);
  const candidateRepos = uniqueRepos([...allowedRepos, ...repos]);
  if (input.requireRequestedRepo && !input.repository) {
    throw new Error(
      `GitHub App connector needs a specific repository before minting a token. Candidate repos: ${formatRepoCandidates(
        candidateRepos
      )}`
    );
  }

  const repo = input.repository ?? firstConcreteRepo(allowedRepos) ?? firstConcreteRepo(repos);
  if (!repo) {
    throw new Error(
      'GitHub App connector requires a requested repo or allowedRepos config to mint an installation token'
    );
  }

  if (allowedRepos.length > 0 && !isRepoAllowed(repo, allowedRepos)) {
    throw new Error(
      `GitHub App connector is not allowed to mint a token for ${repo}. Allowed repos: ${formatRepoCandidates(
        allowedRepos
      )}`
    );
  }

  const [owner, repoName] = repo.split('/');
  if (!owner || !repoName) {
    throw new Error(`GitHub App connector received invalid repo "${repo}"`);
  }
  if (!input.access) {
    throw new Error('GitHub App connector requires sandbox git access before minting a token');
  }

  const permissions: Record<string, string> =
    input.access === 'push-pr'
      ? { contents: 'write', pull_requests: 'write' }
      : { contents: 'read' };
  const minted = await new GithubAppTokenMinter(
    { appId, privateKeyPem: privateKey },
    ctx.log.get('githubApp')
  ).mintForAccount(owner, {
    repositories: [repoName],
    permissions,
  });

  return buildGitHubSandboxToken({
    token: minted.token,
    expiresAt: Date.parse(minted.expiresAt),
    source: 'github_app_installation_token',
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
    isTechnicalPreview: true,
    supportedFeatureIds: ['workflows', 'agentBuilder'],
  },

  auth: {
    types: [
      {
        type: 'oauth_authorization_code',
        defaults: {
          authorizationUrl: 'https://github.com/login/oauth/authorize',
          tokenUrl: 'https://github.com/login/oauth/access_token',
          scope: 'repo',
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
      {
        type: 'github_app',
        defaults: {},
        overrides: {
          label: i18n.translate('core.kibanaConnectorSpecs.github.auth.githubApp.label', {
            defaultMessage: 'GitHub App (sandbox git/gh)',
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
      allowedRepos: z
        .string()
        .optional()
        .describe('GitHub repositories this connector may grant sandbox git access to')
        .meta({
          widget: 'text',
          placeholder: 'elastic/kibana, my-org/*',
          label: i18n.translate('connectorSpecs.github.config.allowedRepos.label', {
            defaultMessage: 'Allowed repositories',
          }),
          helpText: i18n.translate('connectorSpecs.github.config.allowedRepos.helpText', {
            defaultMessage:
              'Comma, space, or newline separated owner/repo entries. Use owner/* to allow all repositories for an owner.',
          }),
        }),
    })
  ),

  validateUrls: {
    fields: ['serverUrl'],
  },

  actions: {
    getMe: {
      isTool: true,
      description: 'Get the authenticated GitHub user profile.',
      input: GetMeInputSchema,
      handler: async (ctx) => {
        return callToolJson(ctx, 'get_me');
      },
    },

    searchCode: {
      isTool: true,
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
      description: 'List issues in a GitHub repository. Uses cursor-based pagination.',
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
      description: 'List pull requests in a GitHub repository. Uses cursor-based pagination.',
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
      description: 'Get the latest release of a GitHub repository.',
      input: GetLatestReleaseInputSchema,
      handler: async (ctx, input: GetLatestReleaseInput) => {
        return callToolJson(ctx, 'get_latest_release', { owner: input.owner, repo: input.repo });
      },
    },

    pullRequestRead: {
      isTool: true,
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

    listTools: {
      isTool: true,
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
      description:
        'Call any tool on the GitHub MCP server directly by name. Use this as an escape hatch when a specific tool is not yet exposed as a named action.',
      input: CallToolInputSchema,
      handler: async (ctx, input: CallToolInput) => {
        return callToolContent(ctx, input.name, input.arguments);
      },
    },
  },

  sandboxCli: {
    skill: [
      'Use this connector when the sandbox needs real git or GitHub CLI access, including clone,',
      'fetch, push, branch creation, or opening pull requests with gh.',
      'Ask for a concrete owner/repo when the task needs push or PR access and the repo is unclear.',
      'If the repository is incomplete or ownerless, for example "kibana" instead of',
      '"elastic/kibana" or "example/kibana", ask which repo to use before requesting credentials.',
      'Do not guess the repository owner.',
      'Use read access for clone-only work and push-pr only when the task must push or open a PR.',
    ].join(' '),
    mintToken: {
      schema: sandboxCliMintTokenInputSchema,
      handler: mintSandboxGitToken,
    },
    mintTokenOptions: {
      handler: describeSandboxGitAccess,
    },
    revokeToken: {
      handler: async () => {},
    },
  },

  test: {
    description: i18n.translate('connectorSpecs.github.test.description', {
      defaultMessage:
        'Verifies connection to the GitHub Copilot MCP server by listing available tools.',
    }),
    handler: async (ctx) => {
      if (ctx.secrets?.authType === 'github_app') {
        return {
          ok: true,
          message:
            'GitHub App credentials are configured. Agent Builder sandboxes will mint repo-scoped installation tokens at run time.',
        };
      }

      return withMcpClient(ctx, async (mcp) => {
        const { tools } = await mcp.listTools();
        return {
          ok: true,
          message: `Connected to GitHub MCP server. ${tools.length} tools available.`,
        };
      });
    },
  },

  skill: [
    'Action strategy guide:',
    '- Start with getMe to identify the authenticated user.',
    '- For broad discovery: use search* actions (searchCode, searchRepositories, searchIssues, searchPullRequests, searchUsers).',
    '- For browsing a specific repo: use list* actions (listIssues, listPullRequests, listCommits, listBranches, listReleases, listTags). All use cursor-based pagination via "first" + "after".',
    '- For specific details: use get* actions (getIssue, getIssueComments, pullRequestRead, getCommit, getLatestRelease, getFileContents).',
    '- For capabilities not yet exposed as named actions: listTools to discover, callTool to invoke.',
  ].join('\n'),
};
