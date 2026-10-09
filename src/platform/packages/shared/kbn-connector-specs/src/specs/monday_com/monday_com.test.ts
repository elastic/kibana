/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { getConnectorSpec } from '../../..';
import { MondayCom } from './monday_com';

// Mock withMcpClient so handlers don't need a real MCP transport.
// callToolJson/callToolContent also route through withMcpClient internally.
const mockCallTool = jest.fn();
const mockListTools = jest.fn();

jest.mock('../../lib/mcp/with_mcp_client', () => ({
  withMcpClient: jest.fn(async (_ctx: unknown, fn: (mcp: unknown) => Promise<unknown>) => {
    return fn({ callTool: mockCallTool, listTools: mockListTools });
  }),
}));

// Apply Zod defaults the way the framework does before invoking a handler.
const parse = <K extends keyof typeof MondayCom.actions>(action: K, raw: Record<string, unknown>) =>
  MondayCom.actions[action].input.parse(raw);

describe('MondayCom', () => {
  const mockPost = jest.fn();
  const mockContext = {
    client: { post: mockPost },
    log: {},
    config: { serverUrl: 'https://mcp.monday.com/mcp' },
  } as unknown as ActionContext;

  const mockJson = { id: '12345', name: 'Test Item' };
  const mockContent = [{ type: 'text', text: JSON.stringify(mockJson) }];

  beforeEach(() => {
    jest.clearAllMocks();
    mockCallTool.mockResolvedValue({ content: mockContent });
    mockListTools.mockResolvedValue({
      tools: Array.from({ length: 62 }, (_, i) => ({ name: `tool_${i}` })),
    });
    mockPost.mockResolvedValue({ data: { data: mockJson } });
  });

  it('should be defined', () => {
    expect(MondayCom).toBeDefined();
  });

  it('should be discoverable via getConnectorSpec (all_specs wiring)', () => {
    const spec = getConnectorSpec('.monday_com');
    expect(spec).toBe(MondayCom);
    expect(spec?.actions.search).toBeDefined();
    expect(spec?.actions.search.isTool).toBe(true);
  });

  describe('metadata', () => {
    it('has correct id and minimum license', () => {
      expect(MondayCom.metadata.id).toBe('.monday_com');
      expect(MondayCom.metadata.minimumLicense).toBe('enterprise');
    });

    it('supports workflows and agentBuilder', () => {
      expect(MondayCom.metadata.supportedFeatureIds).toContain('workflows');
      expect(MondayCom.metadata.supportedFeatureIds).toContain('agentBuilder');
    });

    it('is marked as technical preview', () => {
      expect(MondayCom.metadata.isTechnicalPreview).toBe(true);
    });
  });

  describe('auth', () => {
    it('uses oauth_authorization_code with correct defaults', () => {
      const oauthType = MondayCom.auth?.types.find(
        (t) => typeof t === 'object' && t.type === 'oauth_authorization_code'
      );
      expect(oauthType).toMatchObject({
        type: 'oauth_authorization_code',
        defaults: {
          authorizationUrl: 'https://auth.monday.com/oauth2/authorize',
          tokenUrl: 'https://auth.monday.com/oauth2/token',
        },
      });
    });

    it('marks OAuth as the recommended auth type', () => {
      const oauthType = MondayCom.auth?.types.find(
        (t) => typeof t === 'object' && t.type === 'oauth_authorization_code'
      ) as { isRecommended?: boolean } | undefined;
      expect(oauthType?.isRecommended).toBe(true);
    });

    it('hides all OAuth URL and scope fields', () => {
      const oauthType = MondayCom.auth?.types.find(
        (t) => typeof t === 'object' && t.type === 'oauth_authorization_code'
      ) as { overrides?: { meta?: Record<string, unknown> } } | undefined;
      expect(oauthType?.overrides?.meta).toMatchObject({
        authorizationUrl: { hidden: true },
        tokenUrl: { hidden: true },
        scope: { hidden: true },
      });
    });

    it('includes bearer auth type labelled as Personal API Token', () => {
      const bearerType = MondayCom.auth?.types.find(
        (t) => typeof t === 'object' && t.type === 'bearer'
      ) as { overrides?: { label?: string } } | undefined;
      expect(bearerType).toBeDefined();
      expect(bearerType?.overrides?.label).toBe('Personal API Token');
    });
  });

  describe('schema', () => {
    it('has a serverUrl field with correct default', () => {
      if (!MondayCom.schema) throw new Error('schema not defined');
      const parsed = MondayCom.schema.parse({});
      expect((parsed as { serverUrl?: string }).serverUrl).toBe('https://mcp.monday.com/mcp');
    });
  });

  describe('validateUrls', () => {
    it('validates the serverUrl field', () => {
      expect(MondayCom.validateUrls?.fields).toContain('serverUrl');
    });
  });

  describe('whoAmI action', () => {
    it('is exposed as a tool', () => {
      expect(MondayCom.actions.whoAmI.isTool).toBe(true);
    });

    it('calls get_user_context with no arguments', async () => {
      const input = parse('whoAmI', {});
      await MondayCom.actions.whoAmI.handler(mockContext, input);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'get_user_context',
        arguments: {},
      });
    });
  });

  describe('search action', () => {
    it('is exposed as a tool', () => {
      expect(MondayCom.actions.search.isTool).toBe(true);
    });

    it('calls search with searchTerm and searchType', async () => {
      const input = parse('search', { searchTerm: 'Q3 roadmap', searchType: 'BOARD' });
      await MondayCom.actions.search.handler(mockContext, input);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'search',
        arguments: { searchTerm: 'Q3 roadmap', searchType: 'BOARD' },
      });
    });

    it('rejects an empty searchTerm', () => {
      expect(() => parse('search', { searchTerm: '', searchType: 'BOARD' })).toThrow();
    });
  });

  describe('getBoardInfo action', () => {
    it('is exposed as a tool', () => {
      expect(MondayCom.actions.getBoardInfo.isTool).toBe(true);
    });

    it('calls get_board_info with boardId', async () => {
      const input = parse('getBoardInfo', { boardId: 99887766 });
      await MondayCom.actions.getBoardInfo.handler(mockContext, input);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'get_board_info',
        arguments: { boardId: 99887766 },
      });
    });
  });

  describe('getBoardItemsPage action', () => {
    it('is exposed as a tool', () => {
      expect(MondayCom.actions.getBoardItemsPage.isTool).toBe(true);
    });

    it('calls get_board_items_page with defaults applied', async () => {
      const input = parse('getBoardItemsPage', { boardId: 99887766 });
      await MondayCom.actions.getBoardItemsPage.handler(mockContext, input);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'get_board_items_page',
        arguments: { boardId: 99887766, cursor: undefined, limit: 50 },
      });
    });

    it('calls get_board_items_page with cursor and custom limit', async () => {
      const input = parse('getBoardItemsPage', { boardId: 99887766, cursor: 'abc123', limit: 100 });
      await MondayCom.actions.getBoardItemsPage.handler(mockContext, input);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'get_board_items_page',
        arguments: { boardId: 99887766, cursor: 'abc123', limit: 100 },
      });
    });
  });

  describe('getItem action', () => {
    it('is exposed as a tool', () => {
      expect(MondayCom.actions.getItem.isTool).toBe(true);
    });

    it('posts a GetItem GraphQL query with the item ID', async () => {
      const input = parse('getItem', { itemId: 11223344 });
      await MondayCom.actions.getItem.handler(mockContext, input);

      expect(mockPost).toHaveBeenCalledWith(
        'https://api.monday.com/v2',
        expect.objectContaining({ variables: { ids: ['11223344'] } })
      );
    });

    it('throws when the GraphQL response contains errors', async () => {
      mockPost.mockResolvedValueOnce({ data: { errors: [{ message: 'Not authorized' }] } });
      const input = parse('getItem', { itemId: 11223344 });
      await expect(MondayCom.actions.getItem.handler(mockContext, input)).rejects.toThrow(
        'Not authorized'
      );
    });
  });

  describe('getItemsByColumnValue action', () => {
    it('is exposed as a tool', () => {
      expect(MondayCom.actions.getItemsByColumnValue.isTool).toBe(true);
    });

    it('posts an items_page_by_column_values query with correct variables', async () => {
      const input = parse('getItemsByColumnValue', {
        boardId: 99887766,
        columnId: 'project_status',
        columnValue: 'Done',
      });
      await MondayCom.actions.getItemsByColumnValue.handler(mockContext, input);

      expect(mockPost).toHaveBeenCalledWith(
        'https://api.monday.com/v2',
        expect.objectContaining({
          variables: {
            boardId: '99887766',
            columnId: 'project_status',
            columnValues: ['Done'],
            limit: 50,
          },
        })
      );
    });

    it('throws when the GraphQL response contains errors', async () => {
      mockPost.mockResolvedValueOnce({ data: { errors: [{ message: 'Permission denied' }] } });
      const input = parse('getItemsByColumnValue', {
        boardId: 99887766,
        columnId: 'status',
        columnValue: 'Done',
      });
      await expect(
        MondayCom.actions.getItemsByColumnValue.handler(mockContext, input)
      ).rejects.toThrow('Permission denied');
    });
  });

  describe('createItem action', () => {
    it('is not exposed as a tool', () => {
      expect(MondayCom.actions.createItem.isTool).toBe(false);
    });

    it('calls create_item with required fields and empty columnValues default', async () => {
      const input = parse('createItem', { boardId: 99887766, itemName: 'Fix login bug' });
      await MondayCom.actions.createItem.handler(mockContext, input);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'create_item',
        arguments: {
          boardId: 99887766,
          name: 'Fix login bug',
          groupId: undefined,
          columnValues: '{}',
        },
      });
    });

    it('JSON-stringifies columnValues before sending to MCP', async () => {
      const input = parse('createItem', {
        boardId: 99887766,
        itemName: 'Fix login bug',
        columnValues: { status: { label: 'Done' } },
      });
      await MondayCom.actions.createItem.handler(mockContext, input);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'create_item',
        arguments: expect.objectContaining({
          columnValues: JSON.stringify({ status: { label: 'Done' } }),
        }),
      });
    });
  });

  describe('changeItemColumnValues action', () => {
    it('is not exposed as a tool', () => {
      expect(MondayCom.actions.changeItemColumnValues.isTool).toBe(false);
    });

    it('calls change_item_column_values with camelCase keys and JSON-stringified columnValues', async () => {
      const input = parse('changeItemColumnValues', {
        boardId: 99887766,
        itemId: 11223344,
        columnValues: { status: { label: 'Done' } },
      });
      await MondayCom.actions.changeItemColumnValues.handler(mockContext, input);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'change_item_column_values',
        arguments: {
          boardId: 99887766,
          itemId: 11223344,
          columnValues: JSON.stringify({ status: { label: 'Done' } }),
        },
      });
    });
  });

  describe('createSubitem action', () => {
    it('is not exposed as a tool', () => {
      expect(MondayCom.actions.createSubitem.isTool).toBe(false);
    });

    it('posts a CreateSubitem GraphQL mutation with parentItemId and subitemName', async () => {
      const input = parse('createSubitem', { parentItemId: 11223344, subitemName: 'Sub task' });
      await MondayCom.actions.createSubitem.handler(mockContext, input);

      expect(mockPost).toHaveBeenCalledWith(
        'https://api.monday.com/v2',
        expect.objectContaining({
          variables: { parentItemId: '11223344', itemName: 'Sub task', columnValues: null },
        })
      );
    });

    it('throws when the GraphQL response contains errors', async () => {
      mockPost.mockResolvedValueOnce({ data: { errors: [{ message: 'Invalid parent item' }] } });
      const input = parse('createSubitem', { parentItemId: 11223344, subitemName: 'Sub task' });
      await expect(MondayCom.actions.createSubitem.handler(mockContext, input)).rejects.toThrow(
        'Invalid parent item'
      );
    });
  });

  describe('moveItemToGroup action', () => {
    it('is not exposed as a tool', () => {
      expect(MondayCom.actions.moveItemToGroup.isTool).toBe(false);
    });

    it('posts a MoveItem GraphQL mutation', async () => {
      const input = parse('moveItemToGroup', { itemId: 11223344, groupId: 'new_group29179' });
      await MondayCom.actions.moveItemToGroup.handler(mockContext, input);

      expect(mockPost).toHaveBeenCalledWith(
        'https://api.monday.com/v2',
        expect.objectContaining({
          variables: { itemId: '11223344', groupId: 'new_group29179' },
        })
      );
    });

    it('throws when the GraphQL response contains errors', async () => {
      mockPost.mockResolvedValueOnce({ data: { errors: [{ message: 'Group not found' }] } });
      const input = parse('moveItemToGroup', { itemId: 11223344, groupId: 'bad_group' });
      await expect(MondayCom.actions.moveItemToGroup.handler(mockContext, input)).rejects.toThrow(
        'Group not found'
      );
    });
  });

  describe('archiveItem action', () => {
    it('is not exposed as a tool', () => {
      expect(MondayCom.actions.archiveItem.isTool).toBe(false);
    });

    it('posts an ArchiveItem GraphQL mutation', async () => {
      const input = parse('archiveItem', { itemId: 11223344 });
      await MondayCom.actions.archiveItem.handler(mockContext, input);

      expect(mockPost).toHaveBeenCalledWith(
        'https://api.monday.com/v2',
        expect.objectContaining({ variables: { itemId: '11223344' } })
      );
    });

    it('throws when the GraphQL response contains errors', async () => {
      mockPost.mockResolvedValueOnce({ data: { errors: [{ message: 'Item already archived' }] } });
      const input = parse('archiveItem', { itemId: 11223344 });
      await expect(MondayCom.actions.archiveItem.handler(mockContext, input)).rejects.toThrow(
        'Item already archived'
      );
    });
  });

  describe('deleteItem action', () => {
    it('is not exposed as a tool', () => {
      expect(MondayCom.actions.deleteItem.isTool).toBe(false);
    });

    it('posts a DeleteItem GraphQL mutation', async () => {
      const input = parse('deleteItem', { itemId: 11223344 });
      await MondayCom.actions.deleteItem.handler(mockContext, input);

      expect(mockPost).toHaveBeenCalledWith(
        'https://api.monday.com/v2',
        expect.objectContaining({ variables: { itemId: '11223344' } })
      );
    });

    it('throws when the GraphQL response contains errors', async () => {
      mockPost.mockResolvedValueOnce({
        data: { errors: [{ message: 'Item not found' }, { message: 'Insufficient permissions' }] },
      });
      const input = parse('deleteItem', { itemId: 11223344 });
      await expect(MondayCom.actions.deleteItem.handler(mockContext, input)).rejects.toThrow(
        'Item not found; Insufficient permissions'
      );
    });
  });

  describe('createUpdate action', () => {
    it('is exposed as a tool', () => {
      expect(MondayCom.actions.createUpdate.isTool).toBe(true);
    });

    it('calls create_update with itemId and body', async () => {
      const input = parse('createUpdate', {
        itemId: 11223344,
        body: 'This has been resolved in the latest deployment.',
      });
      await MondayCom.actions.createUpdate.handler(mockContext, input);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'create_update',
        arguments: {
          itemId: 11223344,
          body: 'This has been resolved in the latest deployment.',
        },
      });
    });
  });

  describe('getUpdates action', () => {
    it('is exposed as a tool', () => {
      expect(MondayCom.actions.getUpdates.isTool).toBe(true);
    });

    it('calls get_updates with objectId, objectType, and limit defaults', async () => {
      const input = parse('getUpdates', { objectId: '11223344' });
      await MondayCom.actions.getUpdates.handler(mockContext, input);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'get_updates',
        arguments: { objectId: '11223344', objectType: 'Item', limit: 25 },
      });
    });

    it('calls get_updates with objectType Board when specified', async () => {
      const input = parse('getUpdates', { objectId: '99887766', objectType: 'Board' });
      await MondayCom.actions.getUpdates.handler(mockContext, input);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'get_updates',
        arguments: { objectId: '99887766', objectType: 'Board', limit: 25 },
      });
    });
  });

  describe('editUpdate action', () => {
    it('is exposed as a tool', () => {
      expect(MondayCom.actions.editUpdate.isTool).toBe(true);
    });

    it('posts an EditUpdate GraphQL mutation', async () => {
      const input = parse('editUpdate', { updateId: 98765, body: 'Corrected text.' });
      await MondayCom.actions.editUpdate.handler(mockContext, input);

      expect(mockPost).toHaveBeenCalledWith(
        'https://api.monday.com/v2',
        expect.objectContaining({ variables: { id: '98765', body: 'Corrected text.' } })
      );
    });

    it('throws when the GraphQL response contains errors', async () => {
      mockPost.mockResolvedValueOnce({ data: { errors: [{ message: 'Update not found' }] } });
      const input = parse('editUpdate', { updateId: 98765, body: 'Corrected text.' });
      await expect(MondayCom.actions.editUpdate.handler(mockContext, input)).rejects.toThrow(
        'Update not found'
      );
    });
  });

  describe('createNotification action', () => {
    it('is exposed as a tool', () => {
      expect(MondayCom.actions.createNotification.isTool).toBe(true);
    });

    it('calls create_notification with numeric userId and targetId', async () => {
      const input = parse('createNotification', {
        userId: 110260364,
        targetId: 11223344,
        text: 'Task updated',
        targetType: 'Project',
      });
      await MondayCom.actions.createNotification.handler(mockContext, input);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'create_notification',
        arguments: {
          user_id: 110260364,
          target_id: 11223344,
          text: 'Task updated',
          target_type: 'Project',
        },
      });
    });
  });

  describe('listTools action', () => {
    it('is exposed as a tool', () => {
      expect(MondayCom.actions.listTools.isTool).toBe(true);
    });

    it('returns the list of available tools', async () => {
      const result = await MondayCom.actions.listTools.handler(mockContext, {});
      expect(mockListTools).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
      expect((result as unknown[]).length).toBe(62);
    });
  });

  describe('callTool action', () => {
    it('is exposed as a tool', () => {
      expect(MondayCom.actions.callTool.isTool).toBe(true);
    });

    it('calls the named tool with provided arguments', async () => {
      await MondayCom.actions.callTool.handler(mockContext, {
        name: 'create_board',
        arguments: { board_name: 'My New Board', board_kind: 'public' },
      });
      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'create_board',
        arguments: { board_name: 'My New Board', board_kind: 'public' },
      });
    });

    it('calls the named tool with empty arguments when omitted', async () => {
      await MondayCom.actions.callTool.handler(mockContext, { name: 'list_workspaces' });
      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'list_workspaces',
        arguments: {},
      });
    });
  });

  describe('test handler', () => {
    it('returns {} on successful connection', async () => {
      const result = await MondayCom.test.handler(mockContext);
      expect(mockListTools).toHaveBeenCalled();
      expect(result).toEqual({});
    });

    it('propagates errors thrown by withMcpClient', async () => {
      const { withMcpClient } = jest.requireMock('../../lib/mcp/with_mcp_client');
      withMcpClient.mockRejectedValueOnce(new Error('connection refused'));
      await expect(MondayCom.test.handler(mockContext)).rejects.toThrow('connection refused');
    });
  });

  describe('skill property', () => {
    it('is defined and contains multi-step guidance', () => {
      expect(MondayCom.skill).toBeDefined();
      expect(typeof MondayCom.skill).toBe('string');
      expect(MondayCom.skill).toContain('whoAmI');
      expect(MondayCom.skill).toContain('getBoardInfo');
      expect(MondayCom.skill).toContain('search');
    });
  });
});
