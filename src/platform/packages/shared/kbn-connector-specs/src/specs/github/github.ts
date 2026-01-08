/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import type { ConnectorSpec } from '../../connector_spec';

export const GithubConnector: ConnectorSpec = {
  metadata: {
    id: '.github',
    displayName: 'Github',
    description: i18n.translate('core.kibanaConnectorSpecs.github.metadata.description', {
      defaultMessage: 'Search through repositories and issues in Github',
    }),
    minimumLicense: 'enterprise',
    supportedFeatureIds: ['workflows'],
  },
  auth: {
    types: ['bearer'],
    headers: {
      Accept: 'application/vnd.github+json',
    },
  },

  actions: {
    listRepos: {
      isTool: false,
      input: z.object({
        owner: z.string(),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          owner: string;
        };
        const response = await ctx.client.get(
          `https://api.github.com/users/${typedInput.owner}/repos`
        );
        return response.data.map((repo: { name: string }) => repo.name);
      },
    },
    searchIssues: {
      isTool: false,
      input: z.object({
        owner: z.string(),
        repo: z.string(),
        query: z.string().optional(),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          owner: string;
          repo: string;
          query?: string;
        };
        let searchQuery = `repo:${typedInput.owner}/${typedInput.repo} is:issue is:open`;
        if (typedInput.query) {
          searchQuery += ` ${typedInput.query}`;
        }

        const response = await ctx.client.get('https://api.github.com/search/issues', {
          params: {
            q: searchQuery,
          },
          headers: {
            Accept: 'application/vnd.github.v3+json',
          },
        });
        return response.data;
      },
    },
    searchPullRequests: {
      isTool: false,
      input: z.object({
        owner: z.string(),
        repo: z.string(),
        query: z.string().optional(),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          owner: string;
          repo: string;
          query?: string;
        };
        let searchQuery = `repo:${typedInput.owner}/${typedInput.repo} is:pr is:open`;
        if (typedInput.query) {
          searchQuery += ` ${typedInput.query}`;
        }

        const response = await ctx.client.get('https://api.github.com/search/issues', {
          params: {
            q: searchQuery,
          },
          headers: {
            Accept: 'application/vnd.github.v3+json',
          },
        });
        return response.data;
      },
    },
    searchRepoContents: {
      isTool: false,
      input: z.object({
        owner: z.string(),
        repo: z.string(),
        query: z.string().optional(),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          owner: string;
          repo: string;
          query?: string;
        };
        let searchQuery = `repo:${typedInput.owner}/${typedInput.repo}`;
        if (typedInput.query) {
          searchQuery += ` ${typedInput.query}`;
        }

        const response = await ctx.client.get('https://api.github.com/search/code', {
          params: {
            q: searchQuery,
          },
          headers: {
            Accept: 'application/vnd.github.v3+json',
          },
        });

        // Transform response to only include essential fields
        const transformedItems = response.data.items.map(
          (item: {
            name: string;
            path: string;
            html_url: string;
            repository: { full_name: string };
            score: number;
          }) => ({
            name: item.name,
            path: item.path,
            html_url: item.html_url,
            repository: item.repository.full_name,
            score: item.score,
          })
        );

        const searchRepoContentsResponseSchema = z.object({
          total_count: z.number(),
          items: z.array(
            z.object({
              name: z.string(),
              path: z.string(),
              html_url: z.string(),
              repository: z.string(),
              score: z.number(),
            })
          ),
        });

        return searchRepoContentsResponseSchema.parse({
          total_count: response.data.total_count,
          items: transformedItems,
        });
      },
    },
    getDocs: {
      isTool: false,
      input: z.object({
        owner: z.string(),
        repo: z.string(),
        ref: z.string().optional(),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          owner: string;
          repo: string;
          ref?: string;
        };

        const ref = typedInput.ref || 'main';

        // Get the commit SHA for the ref
        const commitResponse = await ctx.client.get(
          `https://api.github.com/repos/${typedInput.owner}/${typedInput.repo}/commits/${ref}`,
          {
            headers: {
              Accept: 'application/vnd.github.v3+json',
            },
          }
        );
        const commitSha = commitResponse.data.sha;

        // Get the tree from the commit
        const treeResponse = await ctx.client.get(
          `https://api.github.com/repos/${typedInput.owner}/${typedInput.repo}/git/trees/${commitSha}`,
          {
            params: { recursive: '1' },
            headers: {
              Accept: 'application/vnd.github.v3+json',
            },
          }
        );

        // Filter the tree for markdown files
        const markdownFiles = treeResponse.data.tree.filter(
          (file: { type: string; path: string }) =>
            file.type === 'blob' && file.path.toLowerCase().endsWith('.md')
        );

        if (markdownFiles.length === 0) {
          throw new Error(
            `No .md files found in repository ${typedInput.owner}/${typedInput.repo}`
          );
        }

        // Get the content of the markdown files
        const markdownFilesWithContent = await Promise.all(
          markdownFiles.map(async (file: { path: string }) => {
            const response = await ctx.client.get(
              `https://api.github.com/repos/${typedInput.owner}/${typedInput.repo}/contents/${file.path}`,
              {
                params: { ref },
                headers: {
                  Accept: 'application/vnd.github.v3+json',
                },
              }
            );

            return {
              name: response.data.name,
              path: response.data.path,
              content: response.data.content,
              html_url: response.data.html_url,
            };
          })
        );

        const getDocsResponseSchema = z.array(
          z.object({
            name: z.string(),
            path: z.string(),
            content: z.string(),
            html_url: z.string(),
          })
        );

        // Only return the name, path, content, and html_url of markdown files
        return getDocsResponseSchema.parse(markdownFilesWithContent);
      },
    },
    getDoc: {
      isTool: false,
      input: z.object({
        owner: z.string(),
        repo: z.string(),
        path: z.string(),
        ref: z.string().optional(),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          owner: string;
          repo: string;
          path: string;
          ref?: string;
        };

        const ref = typedInput.ref || 'main';

        // Get the content of the specified file
        const response = await ctx.client.get(
          `https://api.github.com/repos/${typedInput.owner}/${typedInput.repo}/contents/${typedInput.path}`,
          {
            params: { ref },
            headers: {
              Accept: 'application/vnd.github.v3+json',
            },
          }
        );

        const getDocResponseSchema = z.object({
          name: z.string(),
          path: z.string(),
          content: z.string(),
          html_url: z.string(),
        });

        // Return the name, path, content, and html_url of the file
        // Note: GitHub API returns content as base64-encoded string
        return getDocResponseSchema.parse({
          name: response.data.name,
          path: response.data.path,
          content: response.data.content,
          html_url: response.data.html_url,
        });
      },
    },
    forkRepo: {
      isTool: false,
      input: z.object({
        owner: z.string(),
        repo: z.string(),
        organization: z.string().optional(),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          owner: string;
          repo: string;
          organization?: string;
        };

        const requestBody = typedInput.organization
          ? { organization: typedInput.organization }
          : {};

        const response = await ctx.client.post(
          `https://api.github.com/repos/${typedInput.owner}/${typedInput.repo}/forks`,
          requestBody,
          {
            headers: {
              Accept: 'application/vnd.github.v3+json',
            },
          }
        );
        return response.data;
      },
    },
    createRepository: {
      isTool: false,
      input: z.object({
        name: z.string(),
        description: z.string().optional(),
        private: z.coerce.boolean().optional(),
        autoInit: z.coerce.boolean().optional(),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          name: string;
          description?: string;
          private?: boolean;
          autoInit?: boolean;
        };

        const requestBody: {
          name: string;
          description?: string;
          private?: boolean;
          auto_init?: boolean;
        } = {
          name: typedInput.name,
        };

        if (typedInput.description !== undefined) {
          requestBody.description = typedInput.description;
        }
        if (typedInput.private !== undefined) {
          requestBody.private = typedInput.private;
        }
        if (typedInput.autoInit !== undefined) {
          requestBody.auto_init = typedInput.autoInit;
        }

        const response = await ctx.client.post('https://api.github.com/user/repos', requestBody, {
          headers: {
            Accept: 'application/vnd.github.v3+json',
          },
        });
        return response.data;
      },
    },
    getFileContents: {
      isTool: false,
      input: z.object({
        owner: z.string(),
        repo: z.string(),
        path: z.string(),
        ref: z.string().optional(),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          owner: string;
          repo: string;
          path: string;
          ref?: string;
        };

        const ref = typedInput.ref || 'main';

        const response = await ctx.client.get(
          `https://api.github.com/repos/${typedInput.owner}/${typedInput.repo}/contents/${typedInput.path}`,
          {
            params: { ref },
            headers: {
              Accept: 'application/vnd.github.v3+json',
            },
          }
        );

        // Return raw response data to support both file and directory responses
        // Files: object with name, path, content (base64), html_url, etc.
        // Directories: array of objects with type, name, path, size, url, etc.
        return response.data;
      },
    },
    listIssues: {
      isTool: false,
      input: z.object({
        owner: z.string(),
        repo: z.string(),
        state: z.enum(['open', 'closed', 'all']).optional(),
        sort: z.enum(['created', 'updated', 'comments']).optional(),
        direction: z.enum(['asc', 'desc']).optional(),
        since: z.string().optional(),
        labels: z.array(z.string()).optional(),
        page: z.coerce.number().min(1).optional(),
        perPage: z.coerce.number().min(1).max(100).optional(),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          owner: string;
          repo: string;
          state?: 'open' | 'closed' | 'all';
          sort?: 'created' | 'updated' | 'comments';
          direction?: 'asc' | 'desc';
          since?: string;
          labels?: string[];
          page?: number;
          perPage?: number;
        };

        const response = await ctx.client.get(
          `https://api.github.com/repos/${typedInput.owner}/${typedInput.repo}/issues`,
          {
            params: {
              ...(typedInput.state && { state: typedInput.state }),
              ...(typedInput.sort && { sort: typedInput.sort }),
              ...(typedInput.direction && { direction: typedInput.direction }),
              ...(typedInput.since && { since: typedInput.since }),
              ...(typedInput.labels && typedInput.labels.length > 0 && { labels: typedInput.labels.join(',') }),
              ...(typedInput.page && { page: typedInput.page }),
              ...(typedInput.perPage && { per_page: typedInput.perPage }),
            },
            headers: {
              Accept: 'application/vnd.github.v3+json',
            },
          }
        );
        return response.data;
      },
    },
    getIssue: {
      isTool: false,
      input: z.object({
        owner: z.string(),
        repo: z.string(),
        issueNumber: z.coerce.number(),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          owner: string;
          repo: string;
          issueNumber: number;
        };

        const response = await ctx.client.get(
          `https://api.github.com/repos/${typedInput.owner}/${typedInput.repo}/issues/${typedInput.issueNumber}`,
          {
            headers: {
              Accept: 'application/vnd.github.v3+json',
            },
          }
        );
        return response.data;
      },
    },
    getIssueComments: {
      isTool: false,
      input: z.object({
        owner: z.string(),
        repo: z.string(),
        issueNumber: z.coerce.number(),
        page: z.coerce.number().optional(),
        perPage: z.coerce.number().optional(),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          owner: string;
          repo: string;
          issueNumber: number;
          page?: number;
          perPage?: number;
        };

        const params: {
          page?: number;
          per_page?: number;
        } = {};

        if (typedInput.page !== undefined) {
          params.page = typedInput.page;
        }
        if (typedInput.perPage !== undefined) {
          params.per_page = typedInput.perPage;
        }

        const response = await ctx.client.get(
          `https://api.github.com/repos/${typedInput.owner}/${typedInput.repo}/issues/${typedInput.issueNumber}/comments`,
          {
            ...(Object.keys(params).length > 0 ? { params } : {}),
            headers: {
              Accept: 'application/vnd.github.v3+json',
            },
          }
        );
        return response.data;
      },
    },
    getPullRequest: {
      isTool: false,
      input: z.object({
        owner: z.string(),
        repo: z.string(),
        pullNumber: z.coerce.number(),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          owner: string;
          repo: string;
          pullNumber: number;
        };

        const response = await ctx.client.get(
          `https://api.github.com/repos/${typedInput.owner}/${typedInput.repo}/pulls/${typedInput.pullNumber}`,
          {
            headers: {
              Accept: 'application/vnd.github.v3+json',
            },
          }
        );
        return response.data;
      },
    },
    getPullRequestComments: {
      isTool: false,
      input: z.object({
        owner: z.string(),
        repo: z.string(),
        pullNumber: z.coerce.number(),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          owner: string;
          repo: string;
          pullNumber: number;
        };

        const response = await ctx.client.get(
          `https://api.github.com/repos/${typedInput.owner}/${typedInput.repo}/pulls/${typedInput.pullNumber}/comments`,
          {
            headers: {
              Accept: 'application/vnd.github.v3+json',
            },
          }
        );
        return response.data;
      },
    },
    getPullRequestDiff: {
      isTool: false,
      input: z.object({
        owner: z.string(),
        repo: z.string(),
        pullNumber: z.coerce.number(),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          owner: string;
          repo: string;
          pullNumber: number;
        };

        const response = await ctx.client.get(
          `https://api.github.com/repos/${typedInput.owner}/${typedInput.repo}/pulls/${typedInput.pullNumber}`,
          {
            headers: {
              Accept: 'application/vnd.github.v3.diff',
            },
          }
        );
        return response.data;
      },
    },
    getPullRequestFiles: {
      isTool: false,
      input: z.object({
        owner: z.string(),
        repo: z.string(),
        pullNumber: z.coerce.number(),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          owner: string;
          repo: string;
          pullNumber: number;
        };

        const response = await ctx.client.get(
          `https://api.github.com/repos/${typedInput.owner}/${typedInput.repo}/pulls/${typedInput.pullNumber}/files`,
          {
            headers: {
              Accept: 'application/vnd.github.v3+json',
            },
          }
        );
        return response.data;
      },
    },
    getPullRequestReviews: {
      isTool: false,
      input: z.object({
        owner: z.string(),
        repo: z.string(),
        pullNumber: z.coerce.number(),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          owner: string;
          repo: string;
          pullNumber: number;
        };

        const response = await ctx.client.get(
          `https://api.github.com/repos/${typedInput.owner}/${typedInput.repo}/pulls/${typedInput.pullNumber}/reviews`,
          {
            headers: {
              Accept: 'application/vnd.github.v3+json',
            },
          }
        );
        return response.data;
      },
    },
    getPullRequestStatus: {
      isTool: false,
      input: z.object({
        owner: z.string(),
        repo: z.string(),
        pullNumber: z.coerce.number(),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          owner: string;
          repo: string;
          pullNumber: number;
        };

        const response = await ctx.client.get(
          `https://api.github.com/repos/${typedInput.owner}/${typedInput.repo}/pulls/${typedInput.pullNumber}`,
          {
            headers: {
              Accept: 'application/vnd.github.v3+json',
            },
          }
        );
        return response.data;
      },
    },
    listBranches: {
      isTool: false,
      input: z.object({
        owner: z.string(),
        repo: z.string(),
        page: z.coerce.number().optional(),
        perPage: z.coerce.number().optional(),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          owner: string;
          repo: string;
          page?: number;
          perPage?: number;
        };

        const params: {
          page?: number;
          per_page?: number;
        } = {};

        if (typedInput.page !== undefined) {
          params.page = typedInput.page;
        }
        if (typedInput.perPage !== undefined) {
          params.per_page = typedInput.perPage;
        }

        const response = await ctx.client.get(
          `https://api.github.com/repos/${typedInput.owner}/${typedInput.repo}/branches`,
          {
            ...(Object.keys(params).length > 0 ? { params } : {}),
            headers: {
              Accept: 'application/vnd.github.v3+json',
            },
          }
        );
        return response.data;
      },
    },
  },

  test: {
    description: i18n.translate('core.kibanaConnectorSpecs.github.test.description', {
      defaultMessage: 'Verifies Github connection by fetching metadata about given data source',
    }),
    handler: async (ctx) => {
      ctx.log.debug('Github test handler');
      const response = await ctx.client.get('https://api.github.com/user');

      if (response.status !== 200) {
        return { ok: false, message: 'Failed to connect to Github API' };
      } else {
        return { ok: true, message: 'Successfully connected to Github API' };
      }
    },
  },
};
