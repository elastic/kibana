/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { IUnsecuredActionsClient } from '@kbn/actions-plugin/server';
import { Logger } from '@kbn/core/server';
import { EsWorkflow, WorkflowExecutionEngineModel } from '@kbn/workflows';
import { WorkflowsExecutionEnginePluginStart } from '@kbn/workflows-execution-engine/server';
import { v4 as generateUuid } from 'uuid';
import { WorkflowsService } from '../workflows_management/workflows_management_service';
import { extractConnectorIds } from './lib/extract_connector_ids';

const findWorkflowsByTrigger = (triggerType: string): WorkflowExecutionEngineModel[] => {
  return [];
};

export class SchedulerService {
  private readonly logger: Logger;
  private readonly actionsClient: IUnsecuredActionsClient;
  private readonly workflowsExecutionEngine: WorkflowsExecutionEnginePluginStart;

  constructor(
    logger: Logger,
    workflowsService: WorkflowsService,
    actionsClient: IUnsecuredActionsClient,
    workflowsExecutionEngine: WorkflowsExecutionEnginePluginStart
  ) {
    this.logger = logger;
    this.actionsClient = actionsClient;
    this.workflowsExecutionEngine = workflowsExecutionEngine;
  }

  public async start() {
    this.logger.info('SchedulerService: Starting');
    // TODO: search for workflows with schedule trigger once we settle on the esmodel
    // const response = await this.workflowsService.searchWorkflows({
    //   triggerType: 'schedule',
    //   limit: 100,
    //   offset: 0,
    //   _full: true,
    // });
    // for (const workflow of response.results) {
    //   this.scheduleWorkflow(workflow);
    // }
  }

  public async scheduleWorkflow(workflow: EsWorkflow) {
    this.logger.info(`Scheduling workflow ${workflow.id}`);
    // this.workflowsExecutionEngine.scheduleWorkflow(workflow);
  }

  public async runWorkflow(
    workflow: WorkflowExecutionEngineModel,
    inputs: Record<string, any>
  ): Promise<string> {
    const connectorCredentials = await extractConnectorIds(workflow, this.actionsClient);

    const workflowRunId = generateUuid();
    await this.workflowsExecutionEngine.executeWorkflow(workflow, {
      workflowRunId,
      inputs,
      event: 'event' in inputs ? inputs.event : undefined,
      connectorCredentials,
      triggeredBy: 'manual', // <-- mark as manual
    });

    return workflowRunId;
  }

  public async pushEvent(eventType: string, eventData: Record<string, any>) {
    try {
      const worklfowsToRun = findWorkflowsByTrigger(eventType);

      for (const workflow of worklfowsToRun) {
        await this.runWorkflow(workflow, {
          event: eventData,
        });
      }
    } catch (error) {
      this.logger.error(`Failed to push event: ${error.message}`);
    }
  }
}
