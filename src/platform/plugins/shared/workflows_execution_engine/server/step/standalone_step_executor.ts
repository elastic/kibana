/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  KibanaRequest,
  Logger,
  IScopedClusterClient,
} from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginStartContract } from '@kbn/actions-plugin/server';
import type { StepContext } from '@kbn/workflows';
import type { ServerStepDefinition, StepHandlerContext } from '@kbn/workflows-extensions/server';
import { buildElasticsearchRequest, SystemConnectorsMap } from '@kbn/workflows';
import { ConnectorExecutor } from '../connector_executor';

const EMPTY_STEP_CONTEXT: StepContext = {
  execution: {
    id: 'standalone',
    isTestRun: false,
    startedAt: new Date(),
    url: '',
  },
  workflow: {
    id: 'standalone',
    name: 'standalone',
    enabled: true,
    spaceId: 'default',
  },
  kibanaUrl: '',
  steps: {},
};

export interface StandaloneStepExecutorDeps {
  getStepDefinition: (id: string) => ServerStepDefinition | undefined;
  hasStepDefinition: (id: string) => boolean;
  getScopedEsClient: (request: KibanaRequest) => IScopedClusterClient;
  actions: ActionsPluginStartContract;
  logger: Logger;
}

export interface ExecuteStepParams {
  stepTypeId: string;
  input: Record<string, unknown>;
  config?: Record<string, unknown>;
  request: KibanaRequest;
  connectorId?: string;
}

export interface ExecuteStepResult {
  output: unknown;
  executionPath: 'custom' | 'connector' | 'elasticsearch';
}

export const createStandaloneStepExecutor = (deps: StandaloneStepExecutorDeps) => {
  const { getStepDefinition, hasStepDefinition, getScopedEsClient, actions, logger } = deps;

  return async (params: ExecuteStepParams): Promise<ExecuteStepResult> => {
    const { stepTypeId, input, config, request, connectorId } = params;

    // Path A: Custom registered steps (ai.prompt, ai.summarize, data.regexReplace, etc.)
    if (hasStepDefinition(stepTypeId)) {
      return executeCustomStep({ stepTypeId, input, config, request });
    }

    // Path C: Built-in ES steps (elasticsearch.*)
    if (stepTypeId.startsWith('elasticsearch.')) {
      return executeElasticsearchStep({ stepTypeId, input, request });
    }

    // Path B: Connector-backed steps (slack, http, jira, etc.)
    return executeConnectorStep({ stepTypeId, input, request, connectorId });
  };

  async function executeCustomStep(params: {
    stepTypeId: string;
    input: Record<string, unknown>;
    config?: Record<string, unknown>;
    request: KibanaRequest;
  }): Promise<ExecuteStepResult> {
    const stepDef = getStepDefinition(params.stepTypeId);
    if (!stepDef) {
      throw new Error(`Step type "${params.stepTypeId}" not found in registry`);
    }

    const esClient = getScopedEsClient(params.request);
    const abortController = new AbortController();

    const handlerContext: StepHandlerContext = {
      input: params.input,
      config: params.config ?? {},
      rawInput: params.input,
      contextManager: {
        getContext: () => EMPTY_STEP_CONTEXT,
        getScopedEsClient: () => esClient.asCurrentUser,
        renderInputTemplate: <T>(value: T) => value,
        getFakeRequest: () => params.request,
      },
      logger: {
        debug: (msg, meta) => logger.debug(`[standalone:${params.stepTypeId}] ${msg}`, meta),
        info: (msg, meta) => logger.info(`[standalone:${params.stepTypeId}] ${msg}`, meta),
        warn: (msg, meta) => logger.warn(`[standalone:${params.stepTypeId}] ${msg}`, meta),
        error: (msg, error) => {
          if (error) {
            logger.error(`[standalone:${params.stepTypeId}] ${msg} - ${error.message}`);
          } else {
            logger.error(`[standalone:${params.stepTypeId}] ${msg}`);
          }
        },
      },
      abortSignal: abortController.signal,
      stepId: `standalone-${params.stepTypeId}-${Date.now()}`,
      stepType: params.stepTypeId,
    };

    const result = await stepDef.handler(handlerContext);

    if (result.error) {
      throw result.error;
    }

    return { output: result.output, executionPath: 'custom' };
  }

  async function executeElasticsearchStep(params: {
    stepTypeId: string;
    input: Record<string, unknown>;
    request: KibanaRequest;
  }): Promise<ExecuteStepResult> {
    const esClient = getScopedEsClient(params.request).asCurrentUser;
    const { stepTypeId, input } = params;

    let result: unknown;

    if (stepTypeId === 'elasticsearch.request' || input.request || input.path) {
      const reqParams = (input.request as Record<string, unknown>) ?? input;
      const { method = 'GET', path, body, headers } = reqParams as {
        method?: string;
        path?: string;
        body?: unknown;
        headers?: Record<string, string>;
      };

      if (!path) {
        throw new Error('elasticsearch.request requires a "path" parameter');
      }

      result = await esClient.transport.request(
        {
          method: method as 'GET' | 'POST' | 'PUT' | 'DELETE',
          path,
          body: body as Record<string, unknown> | undefined,
        },
        headers ? { headers } : {}
      );
    } else {
      const {
        method,
        path,
        body: requestBody,
        query: queryParams,
        bulkBody,
      } = buildElasticsearchRequest(stepTypeId, input);

      let finalPath = path;
      if (queryParams && Object.keys(queryParams).length > 0) {
        const queryString = new URLSearchParams(queryParams).toString();
        finalPath = `${path}?${queryString}`;
      }

      result = await esClient.transport.request({
        method,
        path: finalPath,
        body: !bulkBody ? requestBody : undefined,
        bulkBody,
      });
    }

    return { output: result, executionPath: 'elasticsearch' };
  }

  async function executeConnectorStep(params: {
    stepTypeId: string;
    input: Record<string, unknown>;
    request: KibanaRequest;
    connectorId?: string;
  }): Promise<ExecuteStepResult> {
    const { stepTypeId, input, request, connectorId } = params;

    const actionsClient = await actions.getActionsClientWithRequest(request);
    const connectorExecutor = new ConnectorExecutor(actionsClient);

    const [connectorType, subAction] = stepTypeId.includes('.')
      ? stepTypeId.split('.', 2)
      : [stepTypeId, null];

    const renderedInput = subAction
      ? { subActionParams: input, subAction }
      : input;

    const abortController = new AbortController();

    if (connectorId) {
      const output = await connectorExecutor.execute({
        connectorType,
        connectorNameOrId: connectorId,
        input: renderedInput,
        abortController,
      });

      if (output.status !== 'ok') {
        throw new Error(output.serviceMessage ?? output.message ?? 'Connector execution failed');
      }

      return { output: output.data, executionPath: 'connector' };
    }

    // No connector ID -- try system connector (use SystemConnectorsMap like the full engine)
    const systemConnectorType = SystemConnectorsMap.get(`.${connectorType}`) ?? `.${connectorType}`;
    try {
      const output = await connectorExecutor.executeSystemConnector({
        connectorType: systemConnectorType,
        input: renderedInput,
        abortController,
      });

      if (output.status !== 'ok') {
        throw new Error(output.serviceMessage ?? output.message ?? 'Connector execution failed');
      }

      return { output: output.data, executionPath: 'connector' };
    } catch (systemErr) {
      const errMsg = systemErr instanceof Error ? systemErr.message : String(systemErr);
      const isNotFound = errMsg.includes('not found') && !errMsg.includes('ENOTFOUND');
      if (isNotFound) {
        throw new Error(
          `No system connector available for step "${stepTypeId}". ` +
            `Configure a ${connectorType} connector in Stack Management > Connectors, or provide a connector_id.`
        );
      }
      throw new Error(`${stepTypeId} request failed: ${errMsg}`);
    }
  }

};

export type StandaloneStepExecutor = ReturnType<typeof createStandaloneStepExecutor>;
