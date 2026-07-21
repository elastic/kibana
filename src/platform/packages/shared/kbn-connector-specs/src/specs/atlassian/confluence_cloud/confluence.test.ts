/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../../connector_spec';
import { getConnectorSpec } from '../../../..';
import { ConfluenceCloudConnector } from './confluence';

const mockCallTool = jest.fn();
const mockListTools = jest.fn();

jest.mock('../../../lib/mcp/with_mcp_client', () => ({
  withMcpClient: jest.fn(async (_ctx: unknown, fn: (mcp: unknown) => Promise<unknown>) => {
    return fn({ callTool: mockCallTool, listTools: mockListTools });
  }),
}));

describe('ConfluenceCloudConnector', () => {
  const mockContext = {
    client: {},
    log: { debug: jest.fn() },
    config: { serverUrl: 'https://mcp.atlassian.com/v1/sse' },
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCallTool.mockResolvedValue({
      content: [{ type: 'text', text: '{}' }],
    });
    mockListTools.mockResolvedValue({
      tools: [{ name: 'confluence_list_pages' }, { name: 'confluence_get_page' }],
    });
  });

  describe('auth', () => {
    it('supports only oauth_authorization_code', () => {
      expect(ConfluenceCloudConnector.auth?.types).toHaveLength(1);
      expect(ConfluenceCloudConnector.auth?.types[0]).toMatchObject({
        type: 'oauth_authorization_code',
      });
    });

    it('uses Atlassian OAuth endpoints', () => {
      expect(ConfluenceCloudConnector.auth?.types[0]).toMatchObject({
        defaults: {
          authorizationUrl: 'https://auth.atlassian.com/authorize',
          tokenUrl: 'https://auth.atlassian.com/oauth/token',
        },
      });
    });
  });

  describe('schema', () => {
    it('has a serverUrl field defaulting to the Atlassian MCP server', () => {
      if (!ConfluenceCloudConnector.schema) throw new Error('schema not defined');
      const parsed = ConfluenceCloudConnector.schema.parse({});
      expect((parsed as { serverUrl?: string }).serverUrl).toBe('https://mcp.atlassian.com/v1/sse');
    });
  });

  it('is discoverable via getConnectorSpec', () => {
    const spec = getConnectorSpec('.confluence-cloud');
    expect(spec).toBe(ConfluenceCloudConnector);
  });

  describe('listPages action', () => {
    it('is exposed as a tool', () => {
      expect(ConfluenceCloudConnector.actions.listPages.isTool).toBe(true);
    });

    it('calls confluence_list_pages with mapped parameters', async () => {
      await ConfluenceCloudConnector.actions.listPages.handler(mockContext, {
        limit: 10,
        cursor: 'abc',
        spaceId: '789',
        title: 'test',
        status: 'current',
      });

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'confluence_list_pages',
        arguments: {
          limit: 10,
          cursor: 'abc',
          space_id: '789',
          title: 'test',
          status: 'current',
        },
      });
    });
  });

  describe('getPage action', () => {
    it('is exposed as a tool', () => {
      expect(ConfluenceCloudConnector.actions.getPage.isTool).toBe(true);
    });

    it('calls confluence_get_page with page_id mapped from id', async () => {
      await ConfluenceCloudConnector.actions.getPage.handler(mockContext, { id: '123456' });

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'confluence_get_page',
        arguments: { page_id: '123456' },
      });
    });
  });

  describe('listSpaces action', () => {
    it('is exposed as a tool', () => {
      expect(ConfluenceCloudConnector.actions.listSpaces.isTool).toBe(true);
    });

    it('calls confluence_list_spaces with limit and type', async () => {
      await ConfluenceCloudConnector.actions.listSpaces.handler(mockContext, {
        limit: 20,
        type: 'global',
      });

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'confluence_list_spaces',
        arguments: { limit: 20, type: 'global' },
      });
    });
  });

  describe('getSpace action', () => {
    it('is exposed as a tool', () => {
      expect(ConfluenceCloudConnector.actions.getSpace.isTool).toBe(true);
    });

    it('calls confluence_get_space with space_key mapped from id', async () => {
      await ConfluenceCloudConnector.actions.getSpace.handler(mockContext, { id: 'DEMO' });

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'confluence_get_space',
        arguments: { space_key: 'DEMO' },
      });
    });
  });

  describe('test handler', () => {
    it('returns ok with tool count on successful connection', async () => {
      if (!ConfluenceCloudConnector.test) throw new Error('test handler not defined');
      const result = await ConfluenceCloudConnector.test.handler(mockContext);

      expect(mockListTools).toHaveBeenCalled();
      expect(result).toEqual({
        ok: true,
        message: 'Connected to Atlassian MCP server. 2 tools available.',
      });
    });
  });
});
