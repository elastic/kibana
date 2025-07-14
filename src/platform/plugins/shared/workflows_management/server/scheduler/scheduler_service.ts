import { Logger } from '@kbn/core/server';
import { WorkflowExecutionEngineModel, WorkflowModel } from '@kbn/workflows';
import { WorkflowsService } from '../workflows_management/workflows_management_service';
import { extractConnectorIds } from './lib/extract_connector_ids';
import { PluginStartContract as ActionsPluginStartContract } from '@kbn/actions-plugin/server/plugin';
import { v4 as generateUuid } from 'uuid';
import { WorkflowsExecutionEnginePluginStart } from '@kbn/workflows-execution-engine/server';
import { workflowsGrouppedByTriggerType } from '../mock';
import { IUnsecuredActionsClient } from '@kbn/actions-plugin/server';

const findWorkflowsByTrigger = (triggerType: string): WorkflowExecutionEngineModel[] => {
  return workflowsGrouppedByTriggerType[triggerType] || [];
};

export class SchedulerService {
  private readonly logger: Logger;
  private readonly workflowsService: WorkflowsService;
  private readonly actionsClient: IUnsecuredActionsClient;
  private readonly workflowsExecutionEngine: WorkflowsExecutionEnginePluginStart;

  constructor(
    logger: Logger,
    workflowsService: WorkflowsService,
    actionsClient: IUnsecuredActionsClient,
    workflowsExecutionEngine: WorkflowsExecutionEnginePluginStart
  ) {
    this.logger = logger;
    this.workflowsService = workflowsService;
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

  public async scheduleWorkflow(workflow: WorkflowModel) {
    this.logger.info(`Scheduling workflow ${workflow.id}`);
    // this.workflowsExecutionEngine.scheduleWorkflow(workflow);
  }

  public async runWorkflow(
    workflow: WorkflowExecutionEngineModel,
    inputs: Record<string, any>
  ): Promise<string> {
    const connectorCredentials = await extractConnectorIds(workflow, this.actionsClient);

    const workflowRunId = generateUuid();
    this.workflowsExecutionEngine.executeWorkflow(workflow, {
      workflowRunId,
      inputs,
      event: 'event' in inputs ? inputs.event : undefined,
      connectorCredentials,
    });

    return workflowRunId;
  }

  public async pushEvent(eventType: string, eventData: Record<string, any>) {
    try {
      const worklfowsToRun = findWorkflowsByTrigger(eventType);

      for (const workflow of worklfowsToRun) {
        this.runWorkflow(workflow, {
          event: eventData,
        });
      }
    } catch (error) {
      this.logger.error(`Failed to push event: ${error.message}`);
    }
  }
}
