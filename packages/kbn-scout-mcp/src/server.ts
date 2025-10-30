/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolRequest,
  type ListToolsRequest,
} from '@modelcontextprotocol/sdk/types.js';
import type { ToolingLog } from '@kbn/tooling-log';
import { ScoutSession } from './session';
import type { ScoutMcpOptions } from './types';
import * as tools from './tools';

/**
 * Scout MCP Server
 *
 * Exposes Scout test framework functionality through MCP tools
 */
export class ScoutMcpServer {
  private server: Server;
  private session: ScoutSession;
  private log: ToolingLog;

  constructor(options: ScoutMcpOptions) {
    this.log = options.log;
    this.session = new ScoutSession(options, this.log);

    this.server = new Server(
      {
        name: 'scout-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  /**
   * Setup MCP tool handlers
   */
  private setupToolHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async (request: ListToolsRequest) => {
      return {
        tools: [
          // Browser automation tools
          {
            name: 'scout_navigate',
            description: 'Navigate to a URL or Kibana app',
            inputSchema: {
              type: 'object',
              properties: {
                url: { type: 'string', description: 'Full URL to navigate to' },
                app: { type: 'string', description: 'Kibana app name (e.g., "discover", "dashboard")' },
                path: { type: 'string', description: 'Optional path within the app' },
              },
            },
          },
          {
            name: 'scout_click',
            description: 'Click an element by test subject or selector',
            inputSchema: {
              type: 'object',
              properties: {
                testSubj: { type: 'string', description: 'Test subject selector' },
                selector: { type: 'string', description: 'CSS selector' },
              },
            },
          },
          {
            name: 'scout_type',
            description: 'Type text into an input field',
            inputSchema: {
              type: 'object',
              properties: {
                testSubj: { type: 'string', description: 'Test subject selector' },
                selector: { type: 'string', description: 'CSS selector' },
                text: { type: 'string', description: 'Text to type' },
                submit: { type: 'boolean', description: 'Press Enter after typing' },
                slowly: { type: 'boolean', description: 'Type character by character' },
              },
              required: ['text'],
            },
          },
          {
            name: 'scout_snapshot',
            description: 'Get accessibility snapshot of the current page',
            inputSchema: {
              type: 'object',
              properties: {
                format: { type: 'string', enum: ['text', 'json'], description: 'Output format' },
              },
            },
          },
          {
            name: 'scout_screenshot',
            description: 'Take a screenshot of the page or element',
            inputSchema: {
              type: 'object',
              properties: {
                filename: { type: 'string', description: 'Output filename' },
                fullPage: { type: 'boolean', description: 'Capture full scrollable page' },
                testSubj: { type: 'string', description: 'Test subject to screenshot' },
                selector: { type: 'string', description: 'CSS selector to screenshot' },
              },
            },
          },
          {
            name: 'scout_wait_for',
            description: 'Wait for an element or condition',
            inputSchema: {
              type: 'object',
              properties: {
                time: { type: 'number', description: 'Time to wait in seconds' },
                text: { type: 'string', description: 'Wait for text to appear' },
                testSubj: { type: 'string', description: 'Test subject to wait for' },
                selector: { type: 'string', description: 'CSS selector to wait for' },
                state: { type: 'string', enum: ['visible', 'hidden', 'attached', 'detached'] },
              },
            },
          },
          {
            name: 'scout_get_url',
            description: 'Get current page URL',
            inputSchema: { type: 'object', properties: {} },
          },
          {
            name: 'scout_get_title',
            description: 'Get page title',
            inputSchema: { type: 'object', properties: {} },
          },
          {
            name: 'scout_reload',
            description: 'Reload the current page',
            inputSchema: { type: 'object', properties: {} },
          },

          // Authentication tools
          {
            name: 'scout_login',
            description: 'Login with a role (admin, viewer, privileged, or custom)',
            inputSchema: {
              type: 'object',
              properties: {
                role: { type: 'string', description: 'Role name' },
                customRole: { type: 'object', description: 'Custom role definition' },
              },
              required: ['role'],
            },
          },
          {
            name: 'scout_logout',
            description: 'Logout from current session',
            inputSchema: { type: 'object', properties: {} },
          },
          {
            name: 'scout_get_auth_status',
            description: 'Get current authentication status',
            inputSchema: { type: 'object', properties: {} },
          },

          // Page object tools
          {
            name: 'scout_page_object',
            description: 'Use Scout page objects for high-level interactions',
            inputSchema: {
              type: 'object',
              properties: {
                pageObject: {
                  type: 'string',
                  enum: ['discover', 'dashboard', 'filterBar', 'datePicker', 'maps', 'collapsibleNav', 'toasts'],
                  description: 'Page object name',
                },
                method: { type: 'string', description: 'Method to call' },
                args: { type: 'array', description: 'Method arguments' },
              },
              required: ['pageObject', 'method'],
            },
          },
          {
            name: 'scout_list_page_objects',
            description: 'List available page objects and their methods',
            inputSchema: { type: 'object', properties: {} },
          },

          // EUI component tools
          {
            name: 'scout_eui_component',
            description: 'Interact with EUI components (comboBox, dataGrid, etc.)',
            inputSchema: {
              type: 'object',
              properties: {
                component: {
                  type: 'string',
                  enum: ['comboBox', 'dataGrid', 'checkBox', 'toast', 'selectable'],
                  description: 'Component type',
                },
                testSubj: { type: 'string', description: 'Test subject selector' },
                selector: { type: 'string', description: 'CSS selector' },
                action: { type: 'string', description: 'Action to perform' },
                params: { type: 'object', description: 'Action parameters' },
              },
              required: ['component', 'action'],
            },
          },
          {
            name: 'scout_list_eui_components',
            description: 'List available EUI components and their actions',
            inputSchema: { type: 'object', properties: {} },
          },

          // Fixture tools (informational for now)
          {
            name: 'scout_list_api_services',
            description: 'List available API services',
            inputSchema: { type: 'object', properties: {} },
          },
          {
            name: 'scout_list_fixtures',
            description: 'List available fixture operations',
            inputSchema: { type: 'object', properties: {} },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
      try {
        const { name, arguments: args } = request.params;
        const params = (args || {}) as any; // Cast to any since MCP arguments are generic

        this.log.debug(`Executing tool: ${name}`);

        let result;

        switch (name) {
          // Browser automation
          case 'scout_navigate':
            result = await tools.scoutNavigate(this.session, params);
            break;
          case 'scout_click':
            result = await tools.scoutClick(this.session, params);
            break;
          case 'scout_type':
            result = await tools.scoutType(this.session, params);
            break;
          case 'scout_snapshot':
            result = await tools.scoutSnapshot(this.session, params);
            break;
          case 'scout_screenshot':
            result = await tools.scoutScreenshot(this.session, params);
            break;
          case 'scout_wait_for':
            result = await tools.scoutWaitFor(this.session, params);
            break;
          case 'scout_get_url':
            result = await tools.scoutGetUrl(this.session);
            break;
          case 'scout_get_title':
            result = await tools.scoutGetTitle(this.session);
            break;
          case 'scout_reload':
            result = await tools.scoutReload(this.session);
            break;

          // Authentication
          case 'scout_login':
            result = await tools.scoutLogin(this.session, params);
            break;
          case 'scout_logout':
            result = await tools.scoutLogout(this.session);
            break;
          case 'scout_get_auth_status':
            result = await tools.scoutGetAuthStatus(this.session);
            break;

          // Page objects
          case 'scout_page_object':
            result = await tools.scoutPageObject(this.session, params);
            break;
          case 'scout_list_page_objects':
            result = await tools.scoutListPageObjects();
            break;

          // EUI components
          case 'scout_eui_component':
            result = await tools.scoutEuiComponent(this.session, params);
            break;
          case 'scout_list_eui_components':
            result = await tools.scoutListEuiComponents();
            break;

          // API services and fixtures (informational)
          case 'scout_list_api_services':
            result = await tools.scoutListApiServices();
            break;
          case 'scout_list_fixtures':
            result = await tools.scoutListFixtures();
            break;

          default:
            return {
              content: [
                {
                  type: 'text',
                  text: `Unknown tool: ${name}`,
                },
              ],
              isError: true,
            };
        }

        // Format the result
        if (result.success) {
          return {
            content: [
              {
                type: 'text',
                text: typeof result.data === 'string'
                  ? result.data
                  : JSON.stringify(result.data || result.message, null, 2),
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: 'text',
                text: result.error || 'Operation failed',
              },
            ],
            isError: true,
          };
        }
      } catch (error) {
        this.log.error(`Tool execution error: ${error}`);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    this.log.info('Starting Scout MCP Server...');

    // Initialize the session
    await this.session.initialize();

    // Create transport and connect
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    this.log.success('Scout MCP Server started successfully');
  }

  /**
   * Stop the MCP server
   */
  async stop(): Promise<void> {
    this.log.info('Stopping Scout MCP Server...');

    await this.session.close();
    await this.server.close();

    this.log.success('Scout MCP Server stopped');
  }
}
