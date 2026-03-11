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
import type * as Figma from './types';

const FIGMA_API_BASE = 'https://api.figma.com';

const FILE_PATH_PREFIXES = ['design', 'file', 'board', 'proto', 'slides'] as const;
const FILE_PATH_PREFIX_SET: Set<string> = new Set(FILE_PATH_PREFIXES);
const FILE_KEY_REGEX = /^[0-9a-zA-Z_-]+$/;

export const FigmaConnector: ConnectorSpec = {
  metadata: {
    id: '.figma',
    displayName: 'Figma',
    description: i18n.translate('core.kibanaConnectorSpecs.figma.metadata.description', {
      defaultMessage:
        'Browse Figma design files, inspect structure, render images, and explore team projects',
    }),
    minimumLicense: 'enterprise',
    supportedFeatureIds: ['workflows'],
  },

  auth: {
    types: [{ type: 'api_key_header', defaults: { headerField: 'X-Figma-Token' } }],
  },

  actions: {
    // https://developers.figma.com/docs/rest-api/file-endpoints/#get-file
    // https://developers.figma.com/docs/rest-api/file-endpoints/#get-file-nodes
    // Response always includes components and styles maps alongside the document tree.
    getFile: {
      input: z.object({
        fileKey: z
          .string()
          .describe('File key from the Figma file URL (e.g. from figma.com/file/FILE_KEY/...)'),
        nodeIds: z
          .string()
          .optional()
          .describe('Comma-separated node IDs to retrieve specific nodes (e.g. "1:2,1:3")'),
        depth: z
          .number()
          .optional()
          .describe(
            'Tree depth: 1 = pages only, 2 = pages + top-level objects; omit for full tree'
          ),
      }),
      handler: async (ctx, input: Figma.GetFileInput) => {
        const params: Record<string, string | number> = {};
        if (input.depth !== undefined) {
          params.depth = input.depth;
        }

        if (input.nodeIds) {
          params.ids = input.nodeIds;
          const response = await ctx.client.get(
            `${FIGMA_API_BASE}/v1/files/${input.fileKey}/nodes`,
            { params }
          );
          return response.data;
        }

        const response = await ctx.client.get(`${FIGMA_API_BASE}/v1/files/${input.fileKey}`, {
          params,
        });
        return response.data;
      },
    },

    // https://developers.figma.com/docs/rest-api/file-endpoints/#get-image
    renderNodes: {
      input: z.object({
        fileKey: z.string().describe('File key from the Figma file URL'),
        nodeIds: z
          .string()
          .describe(
            'Comma-separated node IDs to render (e.g. "1:2,1:3"); find in URL ?node-id= or get_file output'
          ),
        format: z
          .enum(['png', 'jpg', 'svg', 'pdf'])
          .optional()
          .describe('Image format (default: png)'),
        scale: z.number().optional().describe('Scale factor between 0.01 and 4 (default: 1)'),
      }),
      handler: async (ctx, input: Figma.RenderNodesInput) => {
        const params: Record<string, string | number> = { ids: input.nodeIds };
        if (input.format) {
          params.format = input.format;
        }
        if (input.scale !== undefined) {
          params.scale = input.scale;
        }

        const response = await ctx.client.get(`${FIGMA_API_BASE}/v1/images/${input.fileKey}`, {
          params,
        });
        return response.data;
      },
    },

    // https://developers.figma.com/docs/rest-api/projects-endpoints/#get-project-files
    listProjectFiles: {
      isTool: false,
      input: z.object({
        projectId: z.string().describe('Figma project ID (from list with type teamProjects or project URL)'),
      }),
      handler: async (ctx, input: Figma.ListProjectFilesInput) => {
        const response = await ctx.client.get(
          `${FIGMA_API_BASE}/v1/projects/${input.projectId}/files`,
          {}
        );
        return response.data;
      },
    },

    // https://developers.figma.com/docs/rest-api/projects-endpoints/#get-team-projects
    listTeamProjects: {
      isTool: false,
      input: z.object({
        teamId: z.string().describe('Figma team ID (found in the URL when viewing a team page)'),
      }),
      handler: async (ctx, input: Figma.ListTeamProjectsInput) => {
        const response = await ctx.client.get(
          `${FIGMA_API_BASE}/v1/teams/${input.teamId}/projects`,
          {}
        );
        return response.data;
      },
    },

    // https://developers.figma.com/docs/rest-api/users-endpoints/#get-me
    whoAmI: {
      input: z.object({}),
      handler: async (ctx, _): Promise<Figma.WhoAmIResult> => {
        const response = await ctx.client.get(`${FIGMA_API_BASE}/v1/me`);
        const data = response.data as Figma.WhoAmIResult;
        return {
          id: data.id,
          handle: data.handle,
          email: data.email,
          img_url: data.img_url,
        };
      },
    },

    parseFigmaUrl: {
      isTool: false,
      input: z.object({
        url: z
          .string()
          .describe('A Figma URL (file, team, or project page). Paste from the browser.'),
      }),
      handler: async (
        _ctx,
        input: Figma.ParseFigmaUrlInput
      ): Promise<Figma.ParseFigmaUrlResult> => {
        const result: Figma.ParseFigmaUrlResult = {};
        try {
          const url = new URL(input.url.trim());
          if (!url.hostname.includes('figma.com')) {
            return result;
          }
          const pathSegments = url.pathname.replace(/^\/+|\/+$/g, '').split('/');
          if (pathSegments.length >= 2 && pathSegments[0] === 'team') {
            result.teamId = pathSegments[1];
          }
          const firstSegment = pathSegments[0];
          if (
            pathSegments.length >= 2 &&
            firstSegment !== undefined &&
            FILE_PATH_PREFIX_SET.has(firstSegment)
          ) {
            const candidate = pathSegments[1];
            if (candidate && FILE_KEY_REGEX.test(candidate)) {
              result.fileKey = candidate;
            }
          }
          const nodeIdParam = url.searchParams.get('node-id');
          if (nodeIdParam) {
            result.nodeId = nodeIdParam.replace(/-/g, ':');
          }
        } catch {
          // Invalid URL; return empty result
        }
        return result;
      },
    },
  },

  test: {
    description: i18n.translate('core.kibanaConnectorSpecs.figma.test.description', {
      defaultMessage: 'Verifies Figma API connectivity by fetching current user information',
    }),
    handler: async (ctx) => {
      try {
        const response = await ctx.client.get(`${FIGMA_API_BASE}/v1/me`);
        return {
          ok: true,
          message: `Successfully connected to Figma as ${
            response.data.handle || response.data.email || 'user'
          }`,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          ok: false,
          message: `Failed to connect to Figma API: ${errorMessage}`,
        };
      }
    },
  },
};
