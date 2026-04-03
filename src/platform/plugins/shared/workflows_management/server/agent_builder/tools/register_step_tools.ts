/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup } from '@kbn/core/server';
import { ToolType } from '@kbn/agent-builder-common';
import type { ToolHandlerContext, ToolHandlerReturn } from '@kbn/agent-builder-server';
import { builtInStepDefinitions, StepCategory } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';
import { getAllConnectors } from '../../../common/schema';
import { ConnectorInputSchemas, ConnectorOutputSchemas } from '../../../common/connector_action_schema';
import { getConnectorSpec } from '@kbn/connector-specs';
import type { AgentBuilderPluginSetupContract, WorkflowsServerPluginStartDeps } from '../../types';

const WORKFLOWS_NS = 'platform.workflows';

const SKIP_STEP_IDS = new Set([
  'console',
  'loop.break',
  'loop.continue',
  'workflow.execute',
  'workflow.executeAsync',
  'waitForInput',
]);

const CONNECTOR_STEPS_WITH_HITL = new Set(['.slack', '.webhook', '.jira', '.email']);

function stepIdToToolId(stepId: string): string {
  return `${WORKFLOWS_NS}.step.${stepId.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
}

function isElasticsearchStep(stepId: string): boolean {
  return stepId.startsWith('elasticsearch.');
}

export const registerStepTools = (
  agentBuilder: AgentBuilderPluginSetupContract,
  coreSetup: CoreSetup<WorkflowsServerPluginStartDeps>
) => {
  // Get ALL step/connector definitions from the single source of truth
  const allConnectorDefs = getAllConnectors();

  // Also get built-in flow control steps
  const builtInIds = new Set(builtInStepDefinitions.map((s) => s.id));

  const registered: string[] = [];

  // 1. Register built-in steps (if, foreach, while, switch, wait, data.set)
  for (const stepDef of builtInStepDefinitions) {
    if (SKIP_STEP_IDS.has(stepDef.id)) continue;

    const toolId = stepIdToToolId(stepDef.id);
    const desc = stepDef.description + (stepDef.documentation?.examples?.[0] ? '\n\nExample:\n' + stepDef.documentation.examples[0] : '');

    try {
      agentBuilder.tools.register({
        id: toolId,
        type: ToolType.builtin,
        description: desc.slice(0, 1000),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        schema: stepDef.inputSchema as any,
        tags: ['workflows', 'step', stepDef.category],
        handler: createStepHandler(coreSetup, stepDef.id, stepDef.category, false),
      });
      registered.push(toolId);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(`[step-tools] Failed: ${toolId}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // 2. Register ALL connector/step definitions (ES, Kibana, Slack, HTTP, AI, data.*, etc.)
  for (const connector of allConnectorDefs) {
    if (builtInIds.has(connector.type)) continue;
    if (SKIP_STEP_IDS.has(connector.type)) continue;

    const toolId = stepIdToToolId(connector.type);
    const isES = isElasticsearchStep(connector.type);
    const hasConnector = connector.hasConnectorId === 'required' || connector.hasConnectorId === 'optional';
    const needsHITL = hasConnector && CONNECTOR_STEPS_WITH_HITL.has(connector.type.startsWith('.') ? connector.type : `.${connector.type}`);

    let desc = connector.description || connector.summary || connector.type;
    if (connector.examples?.snippet) {
      desc += '\n\nExample:\n' + connector.examples.snippet;
    }

    // Use the connector's actual paramsSchema (the real Zod schema)
    let schema = connector.paramsSchema;

    // For ES steps, wrap with an NL "query" field
    if (isES) {
      schema = z.object({
        query: z.string().optional().describe('Natural language search query. Auto-converted to ES DSL.'),
        path: z.string().optional().describe('ES API path, e.g. "/logs-*/_search"'),
        method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).default('POST').describe('HTTP method'),
        body: z.record(z.string(), z.unknown()).optional().describe('Raw ES query DSL body (optional if query provided)'),
      });
    }

    // Connector resolution is handled silently by the handler -- no connector_id in schema

    try {
      agentBuilder.tools.register({
        id: toolId,
        type: ToolType.builtin,
        description: desc.slice(0, 1000),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        schema: schema as any,
        tags: ['workflows', 'step', isES ? 'elasticsearch' : hasConnector ? 'connector' : 'custom'],
        ...(needsHITL ? { confirmation: { askUser: 'always' as const } } : {}),
        handler: createStepHandler(coreSetup, connector.type, isES ? StepCategory.Elasticsearch : StepCategory.External, hasConnector),
      });
      registered.push(toolId);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(`[step-tools] Failed: ${toolId}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // 3. Register dynamic connector steps (Slack, HTTP, etc.) from ConnectorInputSchemas
  const dynamicConnectorDescriptions: Record<string, string> = {
    '.slack': 'Send a message to Slack via webhook. The connector is auto-resolved if only one exists.',
    '.http': 'Generic HTTP fallback. IMPORTANT: Before using this, you MUST call get_connectors to check if a dedicated connector exists for the target service (e.g., GitHub, Jira, Slack). Only use this tool if no dedicated connector type is available.',
    '.email': 'Send an email via a configured email connector.',
    '.teams': 'Send a message to Microsoft Teams.',
    '.jira': 'Create or update a Jira issue.',
    '.slack_api': 'Send a Slack message using the Slack API (supports channels).',
  };

  for (const [actionTypeId, inputSchema] of ConnectorInputSchemas.entries()) {
    const stepType = actionTypeId.replace(/^\./, '');
    const toolId = stepIdToToolId(stepType);
    if (registered.includes(toolId)) continue;

    const desc = dynamicConnectorDescriptions[actionTypeId] || `Execute ${stepType} connector action`;

    try {
      agentBuilder.tools.register({
        id: toolId,
        type: ToolType.builtin,
        description: desc,
        schema: inputSchema as any,
        tags: ['workflows', 'step', 'connector'],
        ...(CONNECTOR_STEPS_WITH_HITL.has(actionTypeId) ? { confirmation: { askUser: 'always' as const } } : {}),
        handler: createStepHandler(coreSetup, stepType, StepCategory.External, true),
      });
      registered.push(toolId);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(`[step-tools] Failed dynamic: ${toolId}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Register the ask_user tool -- lets the agent present choices to the user via HITL
  const ASK_USER_TOOL_ID = `${WORKFLOWS_NS}.ask_user`;
  try {
    agentBuilder.tools.register({
      id: ASK_USER_TOOL_ID,
      type: ToolType.builtin,
      description:
        'Present a choice to the user via an interactive selection dialog. ' +
        'Use this when you need the user to pick between options (e.g., which connector to configure, which action to take). ' +
        'The user sees a radio-button UI and picks one option. Returns the selected option ID.',
      schema: z.object({
        title: z.string().describe('Title for the selection dialog'),
        message: z.string().optional().describe('Description/context for the user'),
        options: z.array(z.object({
          id: z.string().describe('Unique option ID'),
          label: z.string().describe('Display label'),
          description: z.string().optional().describe('Additional description'),
        })).describe('Options to present to the user'),
      }),
      tags: ['workflows', 'hitl'],
      handler: async (
        askParams: { title: string; message?: string; options: Array<{ id: string; label: string; description?: string }> },
        askContext: ToolHandlerContext
      ): Promise<ToolHandlerReturn> => {
        const selectionPromptId = 'ask-user-selection';

        // Check if we're resuming after a selection
        const prevSelection = askContext.prompts.checkSelectionStatus(selectionPromptId);
        if (prevSelection.status === 'selected') {
          return {
            results: [{ type: 'other' as const, data: { selectedOptionId: prevSelection.selectedOptionId } }],
          };
        }
        if (prevSelection.status === 'cancelled') {
          return {
            results: [{ type: 'other' as const, data: { selectedOptionId: null, cancelled: true } }],
          };
        }

        // Show the selection prompt
        return askContext.prompts.askForSelection({
          id: selectionPromptId,
          title: askParams.title,
          message: askParams.message,
          options: askParams.options,
          cancel_text: 'Skip',
        });
      },
    });
    registered.push(ASK_USER_TOOL_ID);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(`[step-tools] Failed to register ask_user: ${e instanceof Error ? e.message : String(e)}`);
  }

  // Register connect_connector tool -- creates a connector instance with credentials from HITL
  const CONNECT_CONNECTOR_TOOL_ID = `${WORKFLOWS_NS}.connect_connector`;
  try {
    agentBuilder.tools.register({
      id: CONNECT_CONNECTOR_TOOL_ID,
      type: ToolType.builtin,
      description:
        'Create and configure a new connector instance. If token is provided, creates immediately. ' +
        'Otherwise prompts the user for credentials via a secure input dialog. Returns the new connector ID and available actions.',
      schema: z.object({
        connectorTypeId: z.string().describe('The connector type ID (e.g. ".github", ".http", ".jira")'),
        name: z.string().describe('Display name for the connector (e.g. "My GitHub", "web-api.github.com")'),
        token: z.string().optional().describe('API key or token. If provided, skips the credential prompt.'),
      }),
      tags: ['workflows', 'connectors', 'hitl'],
      handler: async (
        connectParams: { connectorTypeId: string; name: string; token?: string },
        connectContext: ToolHandlerContext
      ): Promise<ToolHandlerReturn> => {
        const credPromptId = 'connect-connector-creds';

        // If token provided directly, use it (no HITL needed)
        const directToken = connectParams.token;

        // Check if user already provided credentials (resume after HITL)
        const textInput = connectContext.prompts.checkTextInputStatus(credPromptId);
        const tokenValue = directToken || (textInput.status === 'submitted' ? textInput.value : null);
        if (tokenValue) {
          try {
            const [, deps] = await coreSetup.getStartServices();
            const actionsClient = await deps.actions.getActionsClientWithRequest(connectContext.request);
            // Build secrets dynamically from the connector spec's auth schema
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let secrets: any;
            const spec = getConnectorSpec(connectParams.connectorTypeId);
            if (spec?.auth?.types?.length) {
              const authType = spec.auth.types[0];
              // The secrets schema is a discriminated union on authType
              // Each auth type defines its own fields (e.g. bearer: { token }, basic: { user, password })
              // For single-field auth (bearer, api_key), the user provides one value
              secrets = { authType, token: tokenValue };
            } else if (connectParams.connectorTypeId === HTTP_CONNECTOR_TYPE) {
              secrets = { secretHeaders: { Authorization: `Bearer ${tokenValue}` } };
            } else {
              secrets = { token: tokenValue };
            }

            const created = await actionsClient.create({
              action: {
                actionTypeId: connectParams.connectorTypeId,
                name: connectParams.name,
                config: {},
                secrets,
              },
            });
            connectContext.events.reportProgress(`Created connector: ${created.name}`);

            const connectorSpec = getConnectorSpec(connectParams.connectorTypeId);
            const availableActions = connectorSpec?.actions
              ? Object.entries(connectorSpec.actions).map(([actionName, action]) => ({
                  name: actionName,
                  description: (action as { description?: string }).description ?? actionName,
                }))
              : [];

            return {
              results: [{ type: 'other' as const, data: {
                connectorId: created.id,
                name: created.name,
                availableActions,
                nextStep: `Call platform.workflows.step.connector-step with connectorId="${created.id}" and the appropriate action to fulfill the user's request.`,
              } }],
            };
          } catch (createErr) {
            const msg = createErr instanceof Error ? createErr.message : String(createErr);
            return {
              results: [{ type: 'other' as const, data: { error: `Failed to create connector: ${msg}` } }],
            };
          }
        }

        if (textInput.status === 'cancelled') {
          return {
            results: [{ type: 'other' as const, data: { error: 'User cancelled connector setup.' } }],
          };
        }

        // Ask for credentials
        return connectContext.prompts.askForTextInput({
          id: credPromptId,
          title: `Connect ${connectParams.name}`,
          message: `Enter an API key or token for ${connectParams.name}.`,
          placeholder: 'Paste your API key or token...',
          submit_text: 'Connect',
          cancel_text: 'Cancel',
          is_secret: true,
        });
      },
    });
    registered.push(CONNECT_CONNECTOR_TOOL_ID);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(`[step-tools] Failed to register connect_connector: ${e instanceof Error ? e.message : String(e)}`);
  }

  // Generic step execution for dynamically connected connectors (MCP, etc.)
  const EXECUTE_STEP_TOOL_ID = `${WORKFLOWS_NS}.step.connector-step`;
  try {
    agentBuilder.tools.register({
      id: EXECUTE_STEP_TOOL_ID,
      type: ToolType.builtin,
      description:
        'Execute a step on a specific connector by ID. Use this for connectors that were just created via connect_connector. ' +
        'Provide the connector ID, the action name, and input parameters. ' +
        'This runs through the same step execution engine as all other steps.',
      schema: z.object({
        connectorId: z.string().describe('The connector instance ID (from connect_connector or get_connectors)'),
        action: z.string().describe('The action/sub-action name (e.g. "getMe", "searchRepositories", "searchCode")'),
        input: z.record(z.string(), z.unknown()).optional().describe('Input parameters for the action'),
      }),
      tags: ['workflows', 'step', 'connector'],
      handler: async (
        execParams: { connectorId: string; action: string; input?: Record<string, unknown> },
        execContext: ToolHandlerContext
      ): Promise<ToolHandlerReturn> => {
        const [, deps] = await coreSetup.getStartServices();

        execContext.events.reportProgress(`Running ${execParams.action} on connector ${execParams.connectorId}`);

        try {
          const actionsClient = await deps.actions.getActionsClientWithRequest(execContext.request);
          // Strip connector type prefix if present (e.g. "github.getMe" → "getMe")
          const actionName = execParams.action.includes('.')
            ? execParams.action.split('.').slice(1).join('.')
            : execParams.action;

          const result = await actionsClient.execute({
            actionId: execParams.connectorId,
            params: {
              subAction: actionName,
              subActionParams: execParams.input ?? {},
            },
          });

          if (result.status === 'error') {
            const errMsg = result.serviceMessage ?? result.message ?? 'Execution failed';
            execContext.events.reportProgress(`> error: ${errMsg}`);
            return { results: [{ type: 'other' as const, data: { error: errMsg } }] };
          }

          execContext.events.reportProgress(`> done`);
          return { results: [{ type: 'other' as const, data: { output: result.data } }] };
        } catch (execErr) {
          const msg = execErr instanceof Error ? execErr.message : String(execErr);
          execContext.events.reportProgress(`> error: ${msg}`);
          return { results: [{ type: 'other' as const, data: { error: msg } }] };
        }
      },
    });
    registered.push(EXECUTE_STEP_TOOL_ID);
    // eslint-disable-next-line no-console
    console.log(`[step-tools] Registered connectorStep tool: ${EXECUTE_STEP_TOOL_ID}`);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(`[step-tools] Failed to register connectorStep: ${e instanceof Error ? e.message : String(e)}`);
  }

  // eslint-disable-next-line no-console
  console.log(`[step-tools] Registered ${registered.length} step-tools total`);

  return registered;
};

const HTTP_CONNECTOR_TYPE = '.http';

const AUTH_PROMPT_ID = 'step-auth-credentials';

interface ConnectorSelectionState {
  stepTypeId: string;
  params: Record<string, unknown>;
  url: string;
  existingConnectorId?: string;
  dedicatedConnectorTypeId?: string;
  dedicatedConnectorTypeName?: string;
}

function looksLikeAuthError(msg: string): boolean {
  const lower = msg.toLowerCase();
  return lower.includes('401') || lower.includes('unauthorized') ||
    lower.includes('403') || lower.includes('forbidden') ||
    lower.includes('authentication') || lower.includes('api key');
}

function extractBaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return url;
  }
}

function extractHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function createStepHandler(
  coreSetup: CoreSetup<WorkflowsServerPluginStartDeps>,
  stepTypeId: string,
  category: StepCategory,
  hasConnector: boolean
) {
  const isES = isElasticsearchStep(stepTypeId);

  return async (params: Record<string, unknown>, context: ToolHandlerContext): Promise<ToolHandlerReturn> => {
    const [, startDeps] = await coreSetup.getStartServices();
    const { workflowsExecutionEngine } = startDeps;

    // Resume after HITL: text input for credentials
    const savedState = context.stateManager.getState<ConnectorSelectionState>();
    if (savedState?.stepTypeId === stepTypeId) {
      const textInput = context.prompts.checkTextInputStatus(AUTH_PROMPT_ID);
      if (textInput.status === 'submitted' && textInput.value) {
        const { url: savedUrl, params: savedParams } = savedState;
        const baseUrl = extractBaseUrl(savedUrl);
        const hostname = extractHostname(savedUrl);

        try {
          const actionsClient = await startDeps.actions.getActionsClientWithRequest(context.request);
          let connectorIdToUse: string;

          if (savedState.existingConnectorId) {
            context.events.reportProgress(`Updating credentials for ${hostname}...`);
            await actionsClient.update({
              id: savedState.existingConnectorId,
              action: {
                name: `web-${hostname}`,
                config: { url: baseUrl, hasAuth: false, authType: null },
                secrets: { secretHeaders: { Authorization: `Bearer ${textInput.value}` } },
              },
            });
            connectorIdToUse = savedState.existingConnectorId;
          } else {
            context.events.reportProgress(`Creating HTTP connector for ${hostname}...`);
            const created = await actionsClient.create({
              action: {
                actionTypeId: HTTP_CONNECTOR_TYPE,
                name: `web-${hostname}`,
                config: { url: baseUrl, hasAuth: false, authType: null },
                secrets: { secretHeaders: { Authorization: `Bearer ${textInput.value}` } },
              },
            });
            connectorIdToUse = created.id;
          }

          context.events.reportProgress(`Retrying request with credentials...`);
          const result = await workflowsExecutionEngine.executeStandaloneStep({
            stepTypeId,
            input: savedParams as Record<string, unknown>,
            request: context.request,
            connectorId: connectorIdToUse,
          });

          context.events.reportProgress(`> done`);
          return { results: [{ type: 'other' as const, data: { stepType: stepTypeId, output: result.output } }] };
        } catch (retryErr) {
          const retryMsg = retryErr instanceof Error ? retryErr.message : String(retryErr);
          return { results: [{ type: 'other' as const, data: { error: `${stepTypeId} failed after auth: ${retryMsg}` } }] };
        }
      }

      if (textInput.status === 'cancelled') {
        return {
          results: [{
            type: 'other' as const,
            data: { error: `${stepTypeId} requires authentication but user cancelled.` },
          }],
        };
      }
    }

    const stepInput = { ...params } as Record<string, unknown>;

    // fromNL for ES steps
    if (isES && stepInput.query && !stepInput.body) {
      const nlQuery = stepInput.query as string;
      const indexPath = (stepInput.path as string) || '/logs-*/_search';
      const index = indexPath.replace(/\/_search.*$/, '').replace(/^\//, '');

      context.events.reportProgress(`Generating ES query from: "${nlQuery}"`);
      try {
        const model = await context.modelProvider.getDefaultModel();
        const response = await model.chatModel.invoke([
          {
            role: 'system',
            content: `You are an Elasticsearch query generator. Generate a valid ES _search body as JSON.\nRules:\n- Always include "size" (default 10) and "sort": [{"@timestamp": "desc"}]\n- Use broad "query_string" or "match" on "message" instead of guessing field names\n- Return ONLY valid JSON, no markdown, no explanation`,
          },
          { role: 'user', content: `Index: ${index}\nSearch: ${nlQuery}\n\nES _search body JSON:` },
        ]);
        const content = typeof response.content === 'string'
          ? response.content
          : (response.content as Array<{ text?: string }>).map((p) => p.text || '').join('');
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          stepInput.body = JSON.parse(jsonMatch[0]);
          // eslint-disable-next-line no-console
          console.log(`[fromNL] Generated ES body for "${nlQuery}":`, JSON.stringify(stepInput.body, null, 2));
          context.events.reportProgress(`Generated query for: "${nlQuery}"`);
        }
      } catch { context.events.reportProgress(`fromNL failed`); }
      delete stepInput.query;
    }

    // Auto-stringify objects for AI steps
    if (category === StepCategory.Ai && stepInput.input !== undefined && typeof stepInput.input !== 'string') {
      stepInput.input = JSON.stringify(stepInput.input, null, 2);
    }

    // Connector resolution
    let connectorId: string | undefined;
    const isHttpStep = stepTypeId === 'http';
    const requestHeaders = stepInput.headers as Record<string, string> | undefined;
    const hasAuthHeaders = requestHeaders && Object.keys(requestHeaders).some(
      (k) => k.toLowerCase() === 'authorization' || k.toLowerCase() === 'x-api-key'
    );

    if (hasConnector && !isES) {
      try {
        const actionsClient = await startDeps.actions.getActionsClientWithRequest(context.request);
        const allConnectors = await actionsClient.getAll();
        const connectorType = `.${stepTypeId.split('.')[0]}`;
        const matching = allConnectors.filter((c) => c.actionTypeId === connectorType);

        if (matching.length === 1) {
          connectorId = matching[0].id;
          context.events.reportProgress(`Using connector: ${matching[0].name}`);
        } else if (matching.length > 1) {
          // For HTTP connectors, try to match by base URL
          const requestUrl = stepInput.url as string | undefined;
          if (isHttpStep && requestUrl) {
            const baseUrl = extractBaseUrl(requestUrl);
            const urlMatch = matching.find((c) => {
              const connUrl = (c as unknown as { config?: { url?: string } }).config?.url;
              return connUrl && extractBaseUrl(connUrl) === baseUrl;
            });
            if (urlMatch) {
              connectorId = urlMatch.id;
              context.events.reportProgress(`Using connector: ${urlMatch.name} (matched by URL)`);
            }
          }
          if (!connectorId) {
            connectorId = matching[0].id;
            context.events.reportProgress(`Multiple ${stepTypeId} connectors found, using: ${matching[0].name}`);
          }
        } else if (isHttpStep && stepInput.url && hasAuthHeaders) {
          // No HTTP connector + auth headers provided → create a persistent connector with secretHeaders
          const targetUrl = stepInput.url as string;
          const baseUrl = extractBaseUrl(targetUrl);
          const hostname = extractHostname(targetUrl);

          // Extract auth headers into secretHeaders, keep non-auth headers in config
          const secretHeaders: Record<string, string> = {};
          const publicHeaders: Record<string, string> = {};
          for (const [key, val] of Object.entries(requestHeaders)) {
            if (key.toLowerCase() === 'authorization' || key.toLowerCase() === 'x-api-key') {
              secretHeaders[key] = val;
            } else {
              publicHeaders[key] = val;
            }
          }

          context.events.reportProgress(`Creating authenticated HTTP connector for ${hostname}...`);

          const created = await actionsClient.create({
            action: {
              actionTypeId: HTTP_CONNECTOR_TYPE,
              name: `web-${hostname}`,
              config: {
                url: baseUrl,
                ...(Object.keys(publicHeaders).length > 0 ? { headers: publicHeaders } : {}),
                hasAuth: false,
                authType: null,
              },
              secrets: {
                secretHeaders,
              },
            },
          });
          connectorId = created.id;
          // Remove auth headers from step input -- they're now in the connector's secrets
          delete stepInput.headers;
          context.events.reportProgress(`Created connector: ${created.name} (with credentials)`);
        } else if (isHttpStep && stepInput.url) {
          // No HTTP connector -- run via system connector
          context.events.reportProgress(`Using system HTTP connector`);
        } else {
          return {
            results: [{
              type: 'other' as const,
              data: { error: `No ${stepTypeId} connector configured. Create one in Stack Management > Connectors.` },
            }],
          };
        }
      } catch (e) {
        return {
          results: [{
            type: 'other' as const,
            data: { error: `Failed to resolve connector for ${stepTypeId}: ${e instanceof Error ? e.message : String(e)}` },
          }],
        };
      }
    }

    // Progress
    context.events.reportProgress(`$ ${stepTypeId}${isES ? ` ${stepInput.method || 'POST'} ${stepInput.path || ''}` : ''}`);

    try {
      const result = await workflowsExecutionEngine.executeStandaloneStep({
        stepTypeId,
        input: stepInput,
        request: context.request,
        connectorId,
      });

      const out = result.output as Record<string, unknown> | undefined;
      if (out?.hits) {
        const total = (out.hits as any)?.total;
        context.events.reportProgress(`> ${typeof total === 'object' ? total.value : total} hits`);
      } else if (out?.content) {
        context.events.reportProgress(`> ${String(out.content).length} chars`);
      } else {
        context.events.reportProgress(`> done`);
      }

      return { results: [{ type: 'other' as const, data: { stepType: stepTypeId, output: result.output } }] };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);

      if (looksLikeAuthError(msg) && isHttpStep && stepInput.url) {
        context.events.reportProgress(`> authentication required`);

        context.stateManager.setState<ConnectorSelectionState>({
          stepTypeId,
          params,
          url: stepInput.url as string,
          existingConnectorId: connectorId,
        });

        return context.prompts.askForTextInput({
          id: AUTH_PROMPT_ID,
          title: 'Authentication Required',
          message: `The request to ${extractHostname(stepInput.url as string)} returned 401. Provide an API key or token to ${connectorId ? 'update' : 'create'} an HTTP connector.`,
          placeholder: 'Paste your API key or token...',
          submit_text: connectorId ? 'Update & Retry' : 'Connect',
          cancel_text: 'Skip',
          is_secret: true,
        });
      }

      context.events.reportProgress(`stderr: ${msg}`);
      return { results: [{ type: 'other' as const, data: { error: `${stepTypeId} failed: ${msg}` } }] };
    }
  };
}

export const CONNECTOR_DISCOVERY_TOOL_ID = `${WORKFLOWS_NS}.step.discover-connectors`;

export const registerConnectorDiscoveryTool = (
  agentBuilder: AgentBuilderPluginSetupContract,
  coreSetup: CoreSetup<WorkflowsServerPluginStartDeps>
) => {
  agentBuilder.tools.register({
    id: CONNECTOR_DISCOVERY_TOOL_ID,
    type: ToolType.builtin,
    description: 'List available connectors configured in Kibana (Slack, HTTP, Jira, etc.).',
    schema: z.object({
      type: z.string().optional().describe('Filter by connector type (e.g. ".slack"). Omit for all.'),
    }),
    tags: ['workflows', 'connectors', 'discovery'],
    handler: async (params: { type?: string }, context: ToolHandlerContext) => {
      const [, startDeps] = await coreSetup.getStartServices();
      const actionsClient = await startDeps.actions.getActionsClientWithRequest(context.request);
      const allConnectors = await actionsClient.getAll();
      const filtered = params.type ? allConnectors.filter((c) => c.actionTypeId === params.type) : allConnectors;
      return {
        results: [{
          type: 'other' as const,
          data: { connectors: filtered.map((c) => ({ id: c.id, name: c.name, type: c.actionTypeId })) },
        }],
      };
    },
  });
};
