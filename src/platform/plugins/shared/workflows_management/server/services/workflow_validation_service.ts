/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { ValidateWorkflowResponseDto } from '@kbn/workflows';
import type { GetAvailableConnectorsResponse } from '@kbn/workflows/types/v1';
import type { z } from '@kbn/zod/v4';

import type { WorkflowValidationDeps } from './types';
import { validateWorkflowYaml } from '../../common/lib/validate_workflow_yaml';
import { getWorkflowZodSchema } from '../../common/schema';
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

  async validateWorkflow(
    yaml: string,
    spaceId: string,
    request: KibanaRequest
  ): Promise<ValidateWorkflowResponseDto> {
    const zodSchema = await this.getWorkflowZodSchema({ loose: false }, spaceId, request);
    const triggerDefinitions = this.deps.workflowsExtensions?.getAllTriggerDefinitions() ?? [];
    return validateWorkflowYaml(yaml, zodSchema, { triggerDefinitions });
  }

  async getWorkflowZodSchema(
    options: { loose?: false },
    spaceId: string,
    request: KibanaRequest
  ): Promise<z.ZodType> {
    const { connectorTypes } = await this.getAvailableConnectors(spaceId, request);
    const registeredTriggerIds =
      this.deps.workflowsExtensions?.getAllTriggerDefinitions().map((t) => t.id) ?? [];
    return getWorkflowZodSchema(connectorTypes, registeredTriggerIds);
  }
}
