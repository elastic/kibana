import type {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '@kbn/core/server';
import { WorkflowExecutionEngineModel } from '@kbn/workflows';

import { v4 as generateUuid } from 'uuid';
import type {
  WorkflowsExecutionEnginePluginStartDeps,
  WorkflowsPluginSetup,
  WorkflowsPluginStart,
} from './types';
import { defineRoutes } from './routes';
import { WorkflowsManagementApi } from './api';
import { workflowsGrouppedByTriggerType } from './mock';

export class WorkflowsPlugin implements Plugin<WorkflowsPluginSetup, WorkflowsPluginStart> {
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup) {
    this.logger.debug('Workflows Management: Setup');
    const router = core.http.createRouter();

    // Register server side APIs
    defineRoutes(router);

    return {
      management: WorkflowsManagementApi,
    };
  }

  public start(core: CoreStart, plugins: WorkflowsExecutionEnginePluginStartDeps) {
    this.logger.debug('workflows: Start');

    this.logger.debug('workflows: Started');

    const findWorkflowsByTrigger = (triggerType: string): WorkflowExecutionEngineModel[] => {
      return workflowsGrouppedByTriggerType[triggerType] || [];
    };

    const extractConnectorIds = async (
      workflow: WorkflowExecutionEngineModel
    ): Promise<Record<string, Record<string, any>>> => {
      const connectorNames = workflow.steps
        .filter((step) => step.connectorType.endsWith('-connector'))
        .map((step) => step.connectorName);
      const distinctConnectorNames = Array.from(new Set(connectorNames));
      const allConnectors = await plugins.actions.getUnsecuredActionsClient().getAll('default');
      const connectorNameIdMap = new Map<string, string>(
        allConnectors.map((connector) => [connector.name, connector.id])
      );

      return distinctConnectorNames.reduce((acc, name) => {
        const connectorId = connectorNameIdMap.get(name);
        if (connectorId) {
          acc['connector.' + name] = {
            id: connectorId,
          };
        }
        return acc;
      }, {} as Record<string, Record<string, any>>);
    };

    async function runWorkflow(
      workflow: WorkflowExecutionEngineModel,
      inputs: Record<string, any>
    ): Promise<string> {
      const connectorCredentials = await extractConnectorIds(workflow);

      const workflowRunId = generateUuid();
      plugins.workflowsExecutionEngine.executeWorkflow(workflow, {
        workflowRunId,
        inputs,
        event: 'event' in inputs ? inputs.event : undefined,
        connectorCredentials,
      });

      return workflowRunId;
    }

    const pushEvent = async (eventType: string, eventData: Record<string, any>) => {
      try {
        const worklfowsToRun = findWorkflowsByTrigger(eventType);

        for (const workflow of worklfowsToRun) {
          runWorkflow(workflow, {
            event: eventData,
          });
        }
      } catch (error) {
        this.logger.error(`Failed to push event: ${error.message}`);
      }
    };

    // TODO: REMOVE THIS AFTER TESTING
    // Simulate pushing events every 10 seconds for testing purposes
    // setInterval(() => {
    //   pushEvent('detection-rule', {
    //     ruleId: '123',
    //     ruleName: 'Example Detection Rule',
    //     timestamp: new Date().toISOString(),
    //     severity: 'high',
    //     description: 'This is an example detection rule that was triggered.',
    //     additionalData: {
    //       user: 'jdoe',
    //       ip: '109.87.123.433',
    //       action: 'login',
    //       location: 'New York, USA',
    //     },
    //   });
    // }, 10000);

    return {
      // async execute workflow
      pushEvent,
      runWorkflow,
    };
  }

  public stop() {}
}
