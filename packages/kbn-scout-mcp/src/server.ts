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
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  type CallToolRequest,
  type ListToolsRequest,
  type ListResourcesRequest,
  type ReadResourceRequest,
  type ListPromptsRequest,
  type GetPromptRequest,
} from '@modelcontextprotocol/sdk/types.js';
import type { ToolingLog } from '@kbn/tooling-log';
import { ScoutSession } from './session';
import type { ScoutMcpOptions } from './types';
import * as tools from './tools';
import { ResourceManager } from './resources';
import { PROMPTS, getPromptMessage } from './prompts';

/**
 * Scout MCP Server
 *
 * Exposes Scout test framework functionality through MCP tools
 */
export class ScoutMcpServer {
  private server: Server;
  private session: ScoutSession;
  private log: ToolingLog;
  private resourceManager: ResourceManager;

  constructor(options: ScoutMcpOptions) {
    this.log = options.log;
    this.session = new ScoutSession(options, this.log);
    this.resourceManager = new ResourceManager();

    this.server = new Server(
      {
        name: 'scout-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupResourceHandlers();
    this.setupPromptHandlers();
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
                app: {
                  type: 'string',
                  description: 'Kibana app name (e.g., "discover", "dashboard")',
                },
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
          {
            name: 'scout_login_as_admin',
            description: 'Login as admin (convenience method)',
            inputSchema: { type: 'object', properties: {} },
          },
          {
            name: 'scout_login_as_viewer',
            description: 'Login as viewer (convenience method)',
            inputSchema: { type: 'object', properties: {} },
          },
          {
            name: 'scout_login_as_privileged',
            description:
              'Login as privileged user - editor for stateful, developer for ES serverless (convenience method)',
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

          // API services (informational)
          {
            name: 'scout_list_api_services',
            description: 'List available API services',
            inputSchema: { type: 'object', properties: {} },
          },

          // Test generation tools
          {
            name: 'scout_generate_test_file',
            description: 'Generate a Scout test file from current session actions',
            inputSchema: {
              type: 'object',
              properties: {
                testName: { type: 'string', description: 'Name of the test' },
                description: { type: 'string', description: 'Description of what the test does' },
                deploymentTags: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Deployment tags (e.g., ["@ess"], ["@svlSecurity"])',
                },
                useSpaceTest: {
                  type: 'boolean',
                  description: 'Whether to use spaceTest for parallel execution',
                },
              },
              required: ['testName', 'description'],
            },
          },
          {
            name: 'scout_suggest_assertions',
            description: 'Suggest assertions based on current page state',
            inputSchema: { type: 'object', properties: {} },
          },
          {
            name: 'scout_find_selectors',
            description: 'Find all available testSubj selectors on current page',
            inputSchema: {
              type: 'object',
              properties: {
                filter: {
                  type: 'string',
                  description: 'Optional filter to narrow down selectors',
                },
              },
            },
          },

          // Migration tools
          {
            name: 'scout_analyze_cypress_patterns',
            description: 'Analyze Cypress test file and identify patterns',
            inputSchema: {
              type: 'object',
              properties: {
                cypressTestCode: {
                  type: 'string',
                  description: 'Cypress test code to analyze',
                },
                cypressTestPath: {
                  type: 'string',
                  description: 'Optional path to Cypress test file',
                },
                workingDir: {
                  type: 'string',
                  description: 'Optional working directory for file operations',
                },
                checkCoverage: {
                  type: 'boolean',
                  description: 'Whether to check for existing test coverage',
                },
              },
              required: ['cypressTestCode'],
            },
          },
          {
            name: 'scout_convert_cypress_command',
            description: 'Convert a single Cypress command to Scout equivalent',
            inputSchema: {
              type: 'object',
              properties: {
                cypressCommand: {
                  type: 'string',
                  description: 'Cypress command to convert',
                },
              },
              required: ['cypressCommand'],
            },
          },
          {
            name: 'scout_generate_migration_plan',
            description: 'Generate migration plan for Cypress test suite',
            inputSchema: {
              type: 'object',
              properties: {
                cypressTestPath: {
                  type: 'string',
                  description: 'Path to Cypress test directory',
                },
                testFiles: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Optional list of specific test files',
                },
              },
              required: ['cypressTestPath'],
            },
          },

          // Code generation tools
          {
            name: 'scout_generate_page_object_code',
            description: 'Generate page object code',
            inputSchema: {
              type: 'object',
              properties: {
                pageName: { type: 'string', description: 'Name of the page object' },
                description: { type: 'string', description: 'Description of the page' },
                architecture: {
                  type: 'string',
                  enum: ['simple', 'orchestrator'],
                  description: 'Architecture pattern to use',
                },
                locators: {
                  type: 'array',
                  description: 'Array of locator definitions',
                },
                actions: {
                  type: 'array',
                  description: 'Array of action method definitions',
                },
              },
              required: ['pageName', 'description'],
            },
          },
          {
            name: 'scout_generate_api_service_code',
            description: 'Generate API service code',
            inputSchema: {
              type: 'object',
              properties: {
                serviceName: { type: 'string', description: 'Name of the API service' },
                description: { type: 'string', description: 'Description of the service' },
                basePath: { type: 'string', description: 'Base API path' },
                methods: {
                  type: 'array',
                  description: 'Array of API method definitions',
                },
              },
              required: ['serviceName', 'description', 'basePath', 'methods'],
            },
          },

          // Debugging tools
          {
            name: 'scout_get_console_logs',
            description: 'Get console logs from current session',
            inputSchema: {
              type: 'object',
              properties: {
                level: {
                  type: 'string',
                  enum: ['error', 'warn', 'info', 'debug', 'all'],
                  description: 'Log level to filter',
                },
              },
            },
          },
          {
            name: 'scout_get_network_activity',
            description: 'Get network activity from current session',
            inputSchema: {
              type: 'object',
              properties: {
                filter: { type: 'string', description: 'Optional URL filter' },
                limit: { type: 'number', description: 'Maximum number of requests to return' },
              },
            },
          },
          {
            name: 'scout_compare_snapshots',
            description: 'Compare expected snapshot to current page state',
            inputSchema: {
              type: 'object',
              properties: {
                expectedSnapshot: {
                  type: 'string',
                  description: 'Expected page snapshot',
                },
              },
              required: ['expectedSnapshot'],
            },
          },
          {
            name: 'scout_suggest_fix',
            description: 'Suggest fixes for common test failures',
            inputSchema: {
              type: 'object',
              properties: {
                errorMessage: { type: 'string', description: 'Error message from test failure' },
                testCode: { type: 'string', description: 'Optional test code for context' },
              },
              required: ['errorMessage'],
            },
          },
          {
            name: 'scout_analyze_wait_failure',
            description: 'Analyze wait/timeout failures',
            inputSchema: {
              type: 'object',
              properties: {
                element: { type: 'string', description: 'Element selector that failed' },
                timeout: { type: 'number', description: 'Timeout value that was used' },
              },
            },
          },
          // Test analyzer
          {
            name: 'scout_analyze_test_suitability',
            description: 'Analyze if a test should be Scout E2E, integration, or unit test',
            inputSchema: {
              type: 'object',
              properties: {
                testDescription: {
                  type: 'string',
                  description: 'Description of what the test does',
                },
                testCode: {
                  type: 'string',
                  description: 'Optional test code to analyze',
                },
                context: {
                  type: 'string',
                  enum: ['cypress_migration', 'new_test_generation', 'general'],
                  description: 'Context of the analysis',
                },
              },
              required: ['testDescription'],
            },
          },
          {
            name: 'scout_analyze_test_suite',
            description:
              'Analyze an entire Cypress test suite to determine which tests should be E2E vs unit/integration',
            inputSchema: {
              type: 'object',
              properties: {
                cypressTestDirectory: {
                  type: 'string',
                  description: 'Path to directory containing Cypress test files',
                },
                filePattern: {
                  type: 'string',
                  description: 'File pattern to match (default: **/*.cy.{ts,js})',
                },
              },
              required: ['cypressTestDirectory'],
            },
          },
          {
            name: 'scout_assess_migration_risk',
            description:
              'Assess difficulty, effort, and risks for migrating a Cypress test to Scout',
            inputSchema: {
              type: 'object',
              properties: {
                cypressTestCode: {
                  type: 'string',
                  description: 'Full Cypress test code to analyze',
                },
              },
              required: ['cypressTestCode'],
            },
          },
          {
            name: 'scout_suggest_test_conversion',
            description:
              'Suggest how to convert a Cypress test to unit/integration tests (not Scout E2E)',
            inputSchema: {
              type: 'object',
              properties: {
                cypressTestCode: {
                  type: 'string',
                  description: 'Cypress test code to convert',
                },
                testDescription: {
                  type: 'string',
                  description: 'Description of what the test does',
                },
              },
              required: ['cypressTestCode', 'testDescription'],
            },
          },
          {
            name: 'scout_check_test_coverage',
            description:
              'Check if functionality tested by a Cypress test is already covered by existing tests',
            inputSchema: {
              type: 'object',
              properties: {
                cypressTestCode: {
                  type: 'string',
                  description: 'Cypress test code to analyze',
                },
                testDescription: {
                  type: 'string',
                  description: 'Description of what the test does',
                },
                cypressTestPath: {
                  type: 'string',
                  description: 'Optional path to Cypress test file',
                },
                workingDir: {
                  type: 'string',
                  description: 'Optional working directory for search',
                },
              },
              required: ['cypressTestCode', 'testDescription'],
            },
          },
          {
            name: 'scout_generate_unit_or_integration_test',
            description: 'Generate actual unit or integration test file from Cypress test code',
            inputSchema: {
              type: 'object',
              properties: {
                cypressTestCode: {
                  type: 'string',
                  description: 'Cypress test code to convert',
                },
                testDescription: {
                  type: 'string',
                  description: 'Description of what the test does',
                },
                testType: {
                  type: 'string',
                  enum: ['unit', 'integration'],
                  description: 'Type of test to generate',
                },
                outputPath: {
                  type: 'string',
                  description: 'Optional output path for the generated test file',
                },
                workingDir: {
                  type: 'string',
                  description: 'Optional working directory',
                },
              },
              required: ['cypressTestCode', 'testDescription', 'testType'],
            },
          },
          // Test execution
          {
            name: 'scout_run_test',
            description: 'Run a Scout test and get results',
            inputSchema: {
              type: 'object',
              properties: {
                testPath: { type: 'string', description: 'Path to test file' },
                testName: {
                  type: 'string',
                  description: 'Optional test name to run (grep filter)',
                },
                tags: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Tags to filter tests',
                },
                headed: { type: 'boolean', description: 'Run in headed mode (show browser)' },
                debug: { type: 'boolean', description: 'Run in debug mode' },
                timeout: { type: 'number', description: 'Test timeout in milliseconds' },
                workers: { type: 'number', description: 'Number of parallel workers' },
                workingDir: { type: 'string', description: 'Working directory (defaults to cwd)' },
              },
              required: ['testPath'],
            },
          },
          {
            name: 'scout_watch_test',
            description: 'Watch a test file and re-run on changes',
            inputSchema: {
              type: 'object',
              properties: {
                testPath: { type: 'string', description: 'Path to test file' },
                workingDir: { type: 'string', description: 'Working directory' },
              },
              required: ['testPath'],
            },
          },
          {
            name: 'scout_get_test_results',
            description: 'Get results from last test execution',
            inputSchema: {
              type: 'object',
              properties: {
                testPath: { type: 'string', description: 'Optional test path to filter results' },
                workingDir: { type: 'string', description: 'Working directory' },
              },
            },
          },
          // File operations
          {
            name: 'scout_write_file',
            description: 'Write generated code to a file',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string', description: 'File path (relative or absolute)' },
                content: { type: 'string', description: 'File content to write' },
                createDirs: { type: 'boolean', description: 'Create directories if needed' },
                overwrite: { type: 'boolean', description: 'Overwrite if file exists' },
                workingDir: { type: 'string', description: 'Working directory' },
              },
              required: ['path', 'content'],
            },
          },
          {
            name: 'scout_read_file',
            description: 'Read an existing file',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string', description: 'File path to read' },
                workingDir: { type: 'string', description: 'Working directory' },
              },
              required: ['path'],
            },
          },
          {
            name: 'scout_suggest_file_location',
            description: 'Suggest appropriate file location based on Scout conventions',
            inputSchema: {
              type: 'object',
              properties: {
                fileType: {
                  type: 'string',
                  enum: ['test', 'pageObject', 'apiService', 'fixture', 'utility'],
                  description: 'Type of file to create',
                },
                name: { type: 'string', description: 'Name of the file/component' },
                scope: {
                  type: 'string',
                  enum: ['platform', 'security', 'observability', 'management'],
                  description: 'Scope of the code',
                },
                workingDir: { type: 'string', description: 'Working directory' },
              },
              required: ['fileType', 'name'],
            },
          },
          {
            name: 'scout_find_existing_files',
            description: 'Find existing page objects, API services, or tests in the codebase',
            inputSchema: {
              type: 'object',
              properties: {
                pattern: {
                  type: 'string',
                  description: 'Search pattern (e.g., "alerts", "rules")',
                },
                fileType: {
                  type: 'string',
                  enum: ['pageObject', 'apiService', 'test'],
                  description: 'Type of file to search for',
                },
                workingDir: { type: 'string', description: 'Working directory' },
              },
              required: ['pattern'],
            },
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
          case 'scout_login_as_admin':
            result = await tools.scoutLoginAsAdmin(this.session);
            break;
          case 'scout_login_as_viewer':
            result = await tools.scoutLoginAsViewer(this.session);
            break;
          case 'scout_login_as_privileged':
            result = await tools.scoutLoginAsPrivileged(this.session);
            break;

          // EUI components
          case 'scout_eui_component':
            result = await tools.scoutEuiComponent(this.session, params);
            break;
          case 'scout_list_eui_components':
            result = await tools.scoutListEuiComponents();
            break;

          // API services (informational)
          case 'scout_list_api_services':
            result = await tools.scoutListApiServices();
            break;

          // Test generation
          case 'scout_generate_test_file':
            result = await tools.scoutGenerateTestFile(this.session, params);
            break;
          case 'scout_suggest_assertions':
            result = await tools.scoutSuggestAssertions(this.session);
            break;
          case 'scout_find_selectors':
            result = await tools.scoutFindSelectors(this.session, params);
            break;

          // Migration
          case 'scout_analyze_cypress_patterns':
            result = await tools.scoutAnalyzeCypressPatterns(params);
            break;
          case 'scout_convert_cypress_command':
            result = await tools.scoutConvertCypressCommand(params);
            break;
          case 'scout_generate_migration_plan':
            result = await tools.scoutGenerateMigrationPlan(params);
            break;

          // Code generation
          case 'scout_generate_page_object_code':
            result = await tools.scoutGeneratePageObjectCode(params);
            break;
          case 'scout_generate_api_service_code':
            result = await tools.scoutGenerateApiServiceCode(params);
            break;

          // Debugging
          case 'scout_get_console_logs':
            result = await tools.scoutGetConsoleLogs(this.session, params);
            break;
          case 'scout_get_network_activity':
            result = await tools.scoutGetNetworkActivity(this.session, params);
            break;
          case 'scout_compare_snapshots':
            result = await tools.scoutCompareSnapshots(this.session, params);
            break;
          case 'scout_suggest_fix':
            result = await tools.scoutSuggestFix(this.session, params);
            break;
          case 'scout_analyze_wait_failure':
            result = await tools.scoutAnalyzeWaitFailure(this.session, params);
            break;

          // Test analyzer
          case 'scout_analyze_test_suitability':
            result = await tools.scoutAnalyzeTestSuitability(params);
            break;
          case 'scout_analyze_test_suite':
            result = await tools.scoutAnalyzeTestSuite(params);
            break;
          case 'scout_assess_migration_risk':
            result = await tools.scoutAssessMigrationRisk(params);
            break;
          case 'scout_suggest_test_conversion':
            result = await tools.scoutSuggestTestConversion(params);
            break;
          case 'scout_check_test_coverage':
            result = await tools.scoutCheckTestCoverage(params);
            break;
          case 'scout_generate_unit_or_integration_test':
            result = await tools.scoutGenerateUnitOrIntegrationTest(params);
            break;

          // Test execution
          case 'scout_run_test':
            result = await tools.scoutRunTest(params);
            break;
          case 'scout_watch_test':
            result = await tools.scoutWatchTest(params);
            break;
          case 'scout_get_test_results':
            result = await tools.scoutGetTestResults(params);
            break;

          // File operations
          case 'scout_write_file':
            result = await tools.scoutWriteFile(params);
            break;
          case 'scout_read_file':
            result = await tools.scoutReadFile(params);
            break;
          case 'scout_suggest_file_location':
            result = await tools.scoutSuggestFileLocation(params);
            break;
          case 'scout_find_existing_files':
            result = await tools.scoutFindExistingFiles(params);
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
                text:
                  typeof result.data === 'string'
                    ? result.data
                    : JSON.stringify(result.data || result.message, null, 2),
              },
            ],
          };
        } else {
          // Log the error for debugging
          this.log.error(`Tool returned error: ${result.error || 'No error message'}`);
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
        const errorMessage =
          error instanceof Error
            ? error.message || error.toString() || 'Unknown error'
            : String(error) || 'Unknown error';
        const errorDetails =
          error instanceof Error && error.stack ? `\n\nStack:\n${error.stack}` : '';
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${errorMessage}${errorDetails}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  /**
   * Setup MCP resource handlers
   */
  private setupResourceHandlers(): void {
    // List available resources
    this.server.setRequestHandler(
      ListResourcesRequestSchema,
      async (request: ListResourcesRequest) => {
        return {
          resources: this.resourceManager.listResources(),
        };
      }
    );

    // Read a specific resource
    this.server.setRequestHandler(
      ReadResourceRequestSchema,
      async (request: ReadResourceRequest) => {
        try {
          const { uri } = request.params;
          return this.resourceManager.readResource(uri);
        } catch (error) {
          return {
            contents: [
              {
                uri: request.params.uri,
                mimeType: 'text/plain',
                text: `Error reading resource: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              },
            ],
          };
        }
      }
    );
  }

  /**
   * Setup MCP prompt handlers
   */
  private setupPromptHandlers(): void {
    // List available prompts
    this.server.setRequestHandler(ListPromptsRequestSchema, async (request: ListPromptsRequest) => {
      return {
        prompts: PROMPTS,
      };
    });

    // Get a specific prompt
    this.server.setRequestHandler(GetPromptRequestSchema, async (request: GetPromptRequest) => {
      try {
        const { name, arguments: args } = request.params;
        const message = getPromptMessage(name, (args || {}) as Record<string, string>);
        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: message,
              },
            },
          ],
        };
      } catch (error) {
        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `Error generating prompt: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              },
            },
          ],
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
