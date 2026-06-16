/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WaitForInputSetupGraphNode } from '@kbn/workflows/graph';
import { getKibanaUrl, parseDuration } from '../../utils';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger';
import type { NodeImplementation } from '../node_implementation';

const DEFAULT_EXTERNAL_TTL = '1h';
const MAX_EXTERNAL_TTL_MS = 24 * 60 * 60 * 1000;

export interface WaitForInputExternalOutput {
  apiKeyId: string;
  expiresAt?: string;
  resumeUrl: string;
  ttl: string;
}

export class WaitForInputSetupStepImpl implements NodeImplementation {
  constructor(
    private node: WaitForInputSetupGraphNode,
    private stepExecutionRuntime: StepExecutionRuntime,
    private workflowRuntime: WorkflowExecutionRuntimeManager,
    private workflowLogger: IWorkflowEventLogger
  ) {}

  public async run(): Promise<void> {
    this.stepExecutionRuntime.startStep();

    this.stepExecutionRuntime.finishStep({ external: await this.createExternalResumeOutput() });
    this.workflowRuntime.navigateToNextNode();
  }

  private async createExternalResumeOutput(): Promise<WaitForInputExternalOutput> {
    const ttl = this.getValidatedTtl();
    const execution = this.workflowRuntime.getWorkflowExecution();
    const contextManager = this.stepExecutionRuntime.contextManager;
    const esClient = contextManager.getEsClientAsUser();
    const apiKey = await esClient.security.createApiKey({
      name: `workflow-resume-${execution.id}-${this.node.stepId}`,
      expiration: ttl,
      role_descriptors: {
        workflow_external_resume: {
          cluster: [],
          indices: [],
          applications: [],
          run_as: [],
        },
      },
      metadata: {
        application: 'kibana-workflows',
        workflow_execution_id: execution.id,
        workflow_id: execution.workflowId,
        workflow_space_id: execution.spaceId,
        workflow_step_id: this.node.stepId,
        workflow_step_execution_id: this.stepExecutionRuntime.stepExecutionId,
      },
    });

    const resumeUrl = this.buildResumeUrl(apiKey.encoded);
    this.workflowLogger.logDebug(`Created external resume API key for step '${this.node.stepId}'`, {
      event: { action: 'hitl:external-api-key-created' },
      labels: {
        api_key_id: apiKey.id,
        execution_id: execution.id,
      },
    });

    return {
      apiKeyId: apiKey.id,
      ...(apiKey.expiration !== undefined && {
        expiresAt: new Date(apiKey.expiration).toISOString(),
      }),
      resumeUrl,
      ttl,
    };
  }

  private getValidatedTtl(): string {
    const ttl = this.node.configuration.with?.ttl ?? DEFAULT_EXTERNAL_TTL;
    const ttlMs = parseDuration(ttl);

    if (ttlMs > MAX_EXTERNAL_TTL_MS) {
      throw new Error('waitForInput external ttl cannot exceed 24h');
    }

    return ttl;
  }

  private buildResumeUrl(apiKey: string): string {
    const execution = this.workflowRuntime.getWorkflowExecution();
    const contextManager = this.stepExecutionRuntime.contextManager;
    const dependencies = contextManager.getDependencies();
    const kibanaUrl = getKibanaUrl(contextManager.getCoreStart(), dependencies.cloudSetup);
    const spacePrefix = execution.spaceId === 'default' ? '' : `/s/${execution.spaceId}`;
    const url = new URL(
      `${kibanaUrl}${spacePrefix}/api/workflows/executions/${execution.id}/resume/external`
    );
    url.searchParams.set('apiKey', apiKey);
    return url.toString();
  }
}
