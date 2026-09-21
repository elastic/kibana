/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core/server';
import {
  type ConnectorContractUnion,
  toCustomTriggerSchemaConfigs,
  type ValidateWorkflowResponseDto,
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
   * Pre-run gate: inline execution, workflow test and step test all refuse to
   * run when the result is invalid, so it asks only for the rules that already
   * blocked a run.
   */
  async validateWorkflow(
    yaml: string,
    spaceId: string,
    request: KibanaRequest
  ): Promise<ValidateWorkflowResponseDto> {
    return this.runValidation(yaml, spaceId, request, { includeVariableRules: false });
  }

  /**
   * Diagnostics for `POST /api/workflows/validate`: the full rule set the
   * editor runs, variable rules included. Four of those are errors, so gating a
   * run on this result would block workflows that run today.
   */
  async validateWorkflowDiagnostics(
    yaml: string,
    spaceId: string,
    request: KibanaRequest
  ): Promise<ValidateWorkflowResponseDto> {
    return this.runValidation(yaml, spaceId, request, { includeVariableRules: true });
  }

  async getWorkflowZodSchema(
    options: { loose?: false },
    spaceId: string,
    request: KibanaRequest
  ): Promise<z.ZodType> {
    return getWorkflowZodSchemaFromConnectors(
      await this.resolveConnectors(spaceId, request),
      toCustomTriggerSchemaConfigs(this.getRegisteredCustomTriggerDefinitions())
    );
  }

  private async runValidation(
    yaml: string,
    spaceId: string,
    request: KibanaRequest,
    { includeVariableRules }: { includeVariableRules: boolean }
  ): Promise<ValidateWorkflowResponseDto> {
    // Resolved once, so the schema and the registry cannot disagree about a
    // connector and the contracts are not built twice per request.
    const allConnectors = await this.resolveConnectors(spaceId, request);
    const triggerDefinitions = this.getRegisteredCustomTriggerDefinitions();
    const zodSchema = getWorkflowZodSchemaFromConnectors(
      allConnectors,
      toCustomTriggerSchemaConfigs(triggerDefinitions)
    );
    return validateWorkflowYaml(yaml, zodSchema, {
      triggerDefinitions,
      ...(includeVariableRules && {
        variableValidationRegistry: this.createContextRegistry(allConnectors),
      }),
    });
  }

  private async resolveConnectors(
    spaceId: string,
    request: KibanaRequest
  ): Promise<ConnectorContractUnion[]> {
    const { connectorTypes } = await this.getAvailableConnectors(spaceId, request);
    return getAllConnectorsWithDynamic(connectorTypes);
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
