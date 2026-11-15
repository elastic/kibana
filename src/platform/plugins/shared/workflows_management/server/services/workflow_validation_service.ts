/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { once } from 'lodash';
import { firstValueFrom } from 'rxjs';
import type { KibanaRequest } from '@kbn/core/server';
import { buildServerESQLCallbacks } from '@kbn/esql-server-utils';
import type { ESQLCallbacks } from '@kbn/esql-types';
import {
  type ConnectorContractUnion,
  toCustomTriggerSchemaConfigs,
  type ValidateWorkflowResponseDto,
  WORKFLOWS_CORE_SELF_CLIENT_ENABLED_FLAG,
} from '@kbn/workflows';
import type { GetAvailableConnectorsResponse } from '@kbn/workflows/types/v1';
import type { ServerTriggerDefinition } from '@kbn/workflows-extensions/server';
import type { WorkflowContextRegistry } from '@kbn/workflows-yaml';
import type { z } from '@kbn/zod/v4';

import type { WorkflowValidationDeps } from './types';
import { toRegisteredStepOutput } from '../../common/lib/create_workflow_context_registry';
import { validateWorkflowYaml } from '../../common/lib/validate_workflow_yaml';
import {
  getAllConnectorsWithDynamic,
  getWorkflowZodSchemaFromConnectors,
} from '../../common/schema';
import { getAvailableConnectors } from '../api/lib/workflow_connectors';

export class WorkflowValidationService {
  constructor(private readonly deps: WorkflowValidationDeps) {}

  async getAvailableConnectors(
    spaceId: string,
    request: KibanaRequest
  ): Promise<GetAvailableConnectorsResponse> {
    return getAvailableConnectors({
      getActionsClient: this.deps.getActionsClient,
      getActionsClientWithRequest: this.deps.getActionsClientWithRequest,
      spaceId,
      request,
    });
  }

  getRegisteredCustomTriggerDefinitions(): ServerTriggerDefinition[] {
    return this.deps.workflowsExtensions.getAllTriggerDefinitions();
  }

  /**
   * Registered step and trigger metadata plus the connectors this request can
   * see. Built per request: the browser's connector cache is never filled here.
   */
  async getContextRegistry({
    spaceId,
    request,
  }: {
    spaceId: string;
    request: KibanaRequest;
  }): Promise<WorkflowContextRegistry> {
    return this.createContextRegistry(await this.resolveConnectors(spaceId, request));
  }

  /**
   * `includeVariableRules` and `includeEsqlRules` have no default because the
   * callers need opposite answers: both rule groups emit errors, so a caller
   * that refuses to run an invalid workflow must leave them off. Only the
   * reporting endpoint sets them. ES|QL rules check indices and fields against
   * the current user's cluster, which can differ from the one at run time, so
   * they stay report-only until elastic/security-team#18778 lands.
   */
  async validateWorkflow(
    yaml: string,
    spaceId: string,
    request: KibanaRequest,
    {
      includeVariableRules,
      includeEsqlRules,
    }: { includeVariableRules: boolean; includeEsqlRules: boolean }
  ): Promise<ValidateWorkflowResponseDto> {
    // Resolved once, so the schema and the registry cannot disagree about a
    // connector and the contracts are not built twice per request.
    const allConnectors = await this.resolveConnectors(spaceId, request);
    const triggerDefinitions = this.getRegisteredCustomTriggerDefinitions();
    const zodSchema = getWorkflowZodSchemaFromConnectors(
      allConnectors,
      toCustomTriggerSchemaConfigs(triggerDefinitions)
    );
    const warnIgnoredKibanaFetcher = await firstValueFrom(
      this.deps
        .getCoreStart()
        .featureFlags.getBooleanValue$(WORKFLOWS_CORE_SELF_CLIENT_ENABLED_FLAG, false)
    );
    return validateWorkflowYaml(yaml, zodSchema, {
      triggerDefinitions,
      warnIgnoredKibanaFetcher,
      ...(includeVariableRules && {
        variableValidationRegistry: this.createContextRegistry(allConnectors),
      }),
      ...(includeEsqlRules && { esqlCallbacks: this.createEsqlCallbacks(request) }),
    });
  }

  async getWorkflowZodSchema(
    options: { loose?: false },
    spaceId: string,
    request: KibanaRequest
  ): Promise<z.ZodType> {
    // Registered step definitions are latched into a module-level cache on the
    // first call to `getAllConnectorsInternal()`. Async step loaders that resolve
    // after that first call are permanently excluded. Wait for all pending loaders
    // to settle so the cache is never frozen around a partial registry.
    await this.deps.workflowsExtensions?.isReady();

    return getWorkflowZodSchemaFromConnectors(
      await this.resolveConnectors(spaceId, request),
      toCustomTriggerSchemaConfigs(this.getRegisteredCustomTriggerDefinitions())
    );
  }

  private async resolveConnectors(
    spaceId: string,
    request: KibanaRequest
  ): Promise<ConnectorContractUnion[]> {
    const { connectorTypes } = await this.getAvailableConnectors(spaceId, request);
    return getAllConnectorsWithDynamic(connectorTypes);
  }

  /**
   * The callbacks the editor supplies (see `useWorkflowEsqlCallbacks`), backed
   * by the current user's ES client. Sources and policies are fetched once per
   * validation, not once per ES|QL step.
   */
  private createEsqlCallbacks(request: KibanaRequest): ESQLCallbacks {
    const esClient = this.deps.getCoreStart().elasticsearch.client.asScoped(request);
    const { getSources, getColumnsFor, getPolicies } = buildServerESQLCallbacks({
      esClient,
      logger: this.deps.logger,
    });
    return {
      getSources: getSources && once(getSources),
      getColumnsFor,
      getPolicies: getPolicies && once(getPolicies),
      getLicense: once(() => this.deps.licensing.getLicense()),
    };
  }

  private createContextRegistry(allConnectors: ConnectorContractUnion[]): WorkflowContextRegistry {
    const { workflowsExtensions } = this.deps;
    const connectors = new Map(allConnectors.map((connector) => [connector.type, connector]));

    return {
      getStepOutput: (stepTypeId) =>
        toRegisteredStepOutput(workflowsExtensions.getStepDefinition(stepTypeId)),
      getConnector: (stepTypeId) => connectors.get(stepTypeId),
      getTriggerDefinition: (triggerType) => workflowsExtensions.getTriggerDefinition(triggerType),
    };
  }
}
