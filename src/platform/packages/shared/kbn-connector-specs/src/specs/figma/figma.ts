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
      isTool: false,
      input: z.object({
        fileKey: z.string(),
        nodeIds: z.string().optional(),
        depth: z.number().optional(),
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
      isTool: false,
      input: z.object({
        fileKey: z.string(),
        nodeIds: z.string(),
        format: z.enum(['png', 'jpg', 'svg', 'pdf']).optional(),
        scale: z.number().optional(),
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
        projectId: z.string(),
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
        teamId: z.string(),
      }),
      handler: async (ctx, input: Figma.ListTeamProjectsInput) => {
        const response = await ctx.client.get(
          `${FIGMA_API_BASE}/v1/teams/${input.teamId}/projects`,
          {}
        );
        return response.data;
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
