/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { FigmaConnector } from './figma';

describe('FigmaConnector', () => {
  const mockClient = {
    get: jest.fn(),
  };

  const mockContext = {
    client: mockClient,
    log: { debug: jest.fn() },
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('auth', () => {
    it('supports api_key_header auth', () => {
      const types = (FigmaConnector.auth?.types as Array<string | { type: string }>).map((t) =>
        typeof t === 'string' ? t : t.type
      );
      expect(types).toContain('api_key_header');
    });

    it('supports oauth_authorization_code with correct Figma defaults', () => {
      const oauthType = (
        FigmaConnector.auth?.types as Array<
          string | { type: string; defaults?: Record<string, unknown> }
        >
      ).find((t) => typeof t === 'object' && t.type === 'oauth_authorization_code');
      expect(oauthType).toBeDefined();
      expect(oauthType).toMatchObject({
        type: 'oauth_authorization_code',
        defaults: {
          authorizationUrl: 'https://www.figma.com/oauth',
          tokenUrl: 'https://api.figma.com/v1/oauth/token',
          scope: 'current_user:read file_content:read projects:read',
        },
      });
    });
  });

  describe('getFile action', () => {
    it('should fetch a full file when only fileKey is provided', async () => {
      const mockResponse = {
        data: {
          name: 'My Design',
          lastModified: '2025-01-01',
          version: '1',
          document: { id: '0:0', type: 'DOCUMENT' },
          components: {},
          styles: {},
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await FigmaConnector.actions.getFile.handler(mockContext, {
        fileKey: 'abc123',
      });

      expect(mockClient.get).toHaveBeenCalledWith('https://api.figma.com/v1/files/abc123', {
        params: {},
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should fetch specific nodes when nodeIds is provided', async () => {
      const mockResponse = {
        data: {
          name: 'My Design',
          nodes: { '1:2': { document: { id: '1:2' } } },
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await FigmaConnector.actions.getFile.handler(mockContext, {
        fileKey: 'abc123',
        nodeIds: '1:2,1:3',
      });

      expect(mockClient.get).toHaveBeenCalledWith('https://api.figma.com/v1/files/abc123/nodes', {
        params: { ids: '1:2,1:3' },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should pass depth parameter to the file endpoint', async () => {
      mockClient.get.mockResolvedValue({ data: {} });

      await FigmaConnector.actions.getFile.handler(mockContext, {
        fileKey: 'abc123',
        depth: 2,
      });

      expect(mockClient.get).toHaveBeenCalledWith('https://api.figma.com/v1/files/abc123', {
        params: { depth: 2 },
      });
    });

    it('should pass depth parameter to the nodes endpoint when nodeIds present', async () => {
      mockClient.get.mockResolvedValue({ data: {} });

      await FigmaConnector.actions.getFile.handler(mockContext, {
        fileKey: 'abc123',
        nodeIds: '1:2',
        depth: 1,
      });

      expect(mockClient.get).toHaveBeenCalledWith('https://api.figma.com/v1/files/abc123/nodes', {
        params: { ids: '1:2', depth: 1 },
      });
    });
  });

  describe('renderNodes action', () => {
    it('should render nodes with default format', async () => {
      const mockResponse = {
        data: { images: { '1:2': 'https://figma-alpha-api.s3.us-west-2.amazonaws.com/img.png' } },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await FigmaConnector.actions.renderNodes.handler(mockContext, {
        fileKey: 'abc123',
        nodeIds: '1:2',
      });

      expect(mockClient.get).toHaveBeenCalledWith('https://api.figma.com/v1/images/abc123', {
        params: { ids: '1:2' },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should render nodes with custom format and scale', async () => {
      mockClient.get.mockResolvedValue({ data: { images: {} } });

      await FigmaConnector.actions.renderNodes.handler(mockContext, {
        fileKey: 'abc123',
        nodeIds: '1:2,1:3',
        format: 'svg',
        scale: 2,
      });

      expect(mockClient.get).toHaveBeenCalledWith('https://api.figma.com/v1/images/abc123', {
        params: { ids: '1:2,1:3', format: 'svg', scale: 2 },
      });
    });
  });

  describe('listProjectFiles action', () => {
    it('should list files in a project', async () => {
      const mockResponse = {
        data: {
          files: [
            { key: 'file1', name: 'Design A', last_modified: '2025-01-01' },
            { key: 'file2', name: 'Design B', last_modified: '2025-01-02' },
          ],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await FigmaConnector.actions.listProjectFiles.handler(mockContext, {
        projectId: 'proj123',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.figma.com/v1/projects/proj123/files',
        {}
      );
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('listTeamProjects action', () => {
    it('should list projects in a team when teamId is provided', async () => {
      const mockResponse = {
        data: {
          projects: [
            { id: 'p1', name: 'Project Alpha' },
            { id: 'p2', name: 'Project Beta' },
          ],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await FigmaConnector.actions.listTeamProjects.handler(mockContext, {
        teamId: 'team456',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.figma.com/v1/teams/team456/projects',
        {}
      );
      expect(result).toEqual({ ...mockResponse.data, teamId: 'team456' });
    });

    it('should extract teamId from url when teamId is not provided', async () => {
      const mockResponse = {
        data: { projects: [{ id: 'p1', name: 'Project Alpha' }] },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await FigmaConnector.actions.listTeamProjects.handler(mockContext, {
        url: 'https://www.figma.com/team/123456789/Team-Name',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.figma.com/v1/teams/123456789/projects',
        {}
      );
      expect(result).toEqual({ ...mockResponse.data, teamId: '123456789' });
    });

    it('should throw when neither teamId nor url is provided', async () => {
      await expect(
        FigmaConnector.actions.listTeamProjects.handler(mockContext, {})
      ).rejects.toThrow('Either teamId or url is required');
    });

    it('should throw when url is invalid or does not contain team ID', async () => {
      await expect(
        FigmaConnector.actions.listTeamProjects.handler(mockContext, {
          url: 'https://www.figma.com/design/ABC123/My-File',
        })
      ).rejects.toThrow('URL did not match a file or team page');
    });
  });

  describe('whoAmI action', () => {
    it('should return current user id, handle, email, and img_url', async () => {
      const mockResponse = {
        data: {
          id: 'user-123',
          handle: 'designer',
          email: 'designer@example.com',
          img_url: 'https://figma.com/avatar.png',
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await FigmaConnector.actions.whoAmI.handler(mockContext, {});

      expect(mockClient.get).toHaveBeenCalledWith('https://api.figma.com/v1/me');
      expect(result).toEqual({
        id: 'user-123',
        handle: 'designer',
        email: 'designer@example.com',
        img_url: 'https://figma.com/avatar.png',
      });
    });
  });

  describe('test handler', () => {
    it('should return success when API is accessible', async () => {
      if (!FigmaConnector.test) {
        throw new Error('Test handler not defined');
      }
      mockClient.get.mockResolvedValue({
        data: { handle: 'designer', email: 'designer@example.com' },
      });

      const result = await FigmaConnector.test.handler(mockContext);

      expect(mockClient.get).toHaveBeenCalledWith('https://api.figma.com/v1/me');
      expect(result).toEqual({
        ok: true,
        message: 'Successfully connected to Figma as designer',
      });
    });

    it('should fall back to email when handle is not present', async () => {
      if (!FigmaConnector.test) {
        throw new Error('Test handler not defined');
      }
      mockClient.get.mockResolvedValue({
        data: { email: 'designer@example.com' },
      });

      const result = await FigmaConnector.test.handler(mockContext);

      expect(result).toEqual({
        ok: true,
        message: 'Successfully connected to Figma as designer@example.com',
      });
    });

    it('should return failure when API is not accessible', async () => {
      if (!FigmaConnector.test) {
        throw new Error('Test handler not defined');
      }
      mockClient.get.mockRejectedValue(new Error('Invalid token'));

      const result = await FigmaConnector.test.handler(mockContext);

      expect(result.ok).toBe(false);
      expect(result.message).toContain('Failed to connect to Figma API');
      expect(result.message).toContain('Invalid token');
    });
  });
});
