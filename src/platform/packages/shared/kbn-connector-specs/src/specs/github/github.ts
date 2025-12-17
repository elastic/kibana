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
      'Accept': 'application/vnd.github+json',
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
        try {
          const response = await ctx.client.get(`https://api.github.com/users/${typedInput.owner}/repos`);
          return response.data.map((repo: { name: string }) => repo.name);
        } catch (error: any) {
          if (error?.response?.status === 404) {
            throw new Error(
              `User or organization '${typedInput.owner}' not found. Please verify the owner name is correct.`
            );
          }
          throw error;
        }
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
        try {
          let searchQuery = `repo:${typedInput.owner}/${typedInput.repo} is:issue is:open`;
          if (typedInput.query) {
            searchQuery += ` ${typedInput.query}`;
          }

          const response = await ctx.client.get('https://api.github.com/search/issues', {
            params: {
              q: searchQuery,
            },
            headers: {
              Accept: 'application/vnd.github.v3+json'
            }
          });
          return response.data
        } catch (error: any) {
          if (error?.response?.status === 422) {
            const errorMessage = error?.response?.data?.message || 'Invalid search query';
            throw new Error(
              `Invalid GitHub search query: ${errorMessage}. Please check your query syntax`
            );
          }
          throw error;
        }
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
          (file: { type: string; path: string }) => file.type === 'blob' && file.path.toLowerCase().endsWith('.md')
        );

        if (markdownFiles.length === 0) {
          throw new Error(`No .md files found in repository ${typedInput.owner}/${typedInput.repo}`);
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
  },

  test: {
    description: i18n.translate('core.kibanaConnectorSpecs.github.test.description', {
      defaultMessage: 'Verifies Github connection by fetching metadata about given data source',
    }),
    handler: async (ctx) => {
      ctx.log.debug('Github test handler');

      try {
        const response = await ctx.client.get('https://api.github.com/users');
        const numOfUsers = response.data.results.length;
        return {
          ok: true,
          message: `Successfully connected to Github API: found ${numOfUsers} users`,
        };
      } catch (error) {
        return { ok: false, message: error.message };
      }
    },
  },
};