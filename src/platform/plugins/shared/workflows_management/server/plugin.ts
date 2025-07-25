/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  CoreSetup,
  CoreStart,
  DEFAULT_APP_CATEGORIES,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';

import { IUnsecuredActionsClient } from '@kbn/actions-plugin/server';
import { KibanaFeatureScope } from '@kbn/features-plugin/common';
import { i18n } from '@kbn/i18n';
import {
  WORKFLOWS_EXECUTION_LOGS_INDEX,
  WORKFLOWS_EXECUTIONS_INDEX,
  WORKFLOWS_STEP_EXECUTIONS_INDEX,
} from '../common';
import { workflowSavedObjectType } from './saved_objects/workflow';
import { SchedulerService } from './scheduler/scheduler_service';
import { createWorkflowTaskRunner } from './tasks/workflow_task_runner';
import { WorkflowTaskScheduler } from './tasks/workflow_task_scheduler';
import type {
  WorkflowsExecutionEnginePluginStartDeps,
  WorkflowsManagementPluginServerDependenciesSetup,
  WorkflowsPluginSetup,
  WorkflowsPluginStart,
} from './types';
import { WorkflowsManagementApi } from './workflows_management/workflows_management_api';
import { defineRoutes } from './workflows_management/workflows_management_routes';
import { WorkflowsService } from './workflows_management/workflows_management_service';

/**
 * The order of appearance in the feature privilege page
 * under the management section.
 */
const FEATURE_ORDER = 3000;

export class WorkflowsPlugin implements Plugin<WorkflowsPluginSetup, WorkflowsPluginStart> {
  private readonly logger: Logger;
  private workflowsService: WorkflowsService | null = null;
  private schedulerService: SchedulerService | null = null;
  private workflowTaskScheduler: WorkflowTaskScheduler | null = null;
  private unsecureActionsClient: IUnsecuredActionsClient | null = null;
  private api: WorkflowsManagementApi | null = null;
  // TODO: replace with esClient promise from core

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup, plugins: WorkflowsManagementPluginServerDependenciesSetup) {
    this.logger.debug('Workflows Management: Setup');

    // Register workflow task definition
    if (plugins.taskManager) {
      plugins.taskManager.registerTaskDefinitions({
        'workflow:scheduled': {
          title: 'Scheduled Workflow Execution',
          description: 'Executes workflows on a scheduled basis',
          timeout: '5m',
          maxAttempts: 3,
          createTaskRunner: ({ taskInstance }) => {
            // Capture the plugin instance in a closure
            const plugin = this;
            // Use a factory pattern to get dependencies when the task runs
            return {
              async run() {
                // Get dependencies when the task actually runs
                const [, pluginsStart] = await core.getStartServices();

                // Create the actual task runner with dependencies
                const taskRunner = createWorkflowTaskRunner({
                  logger: plugin.logger,
                  workflowsService: plugin.workflowsService!,
                  workflowsExecutionEngine: (pluginsStart as any).workflowsExecutionEngine,
                  actionsClient: plugin.unsecureActionsClient!,
                })({ taskInstance });

                return taskRunner.run();
              },
              async cancel() {
                // Cancel function for the task
              },
            };
          },
        },
      });
    }

    // Register saved object types
    core.savedObjects.registerType(workflowSavedObjectType);

    plugins.features?.registerKibanaFeature({
      id: 'workflowsManagement',
      name: i18n.translate(
        'platform.plugins.shared.workflows_management.featureRegistry.workflowsManagementFeatureName',
        {
          defaultMessage: 'Workflows Management',
        }
      ),
      category: DEFAULT_APP_CATEGORIES.management,
      scope: [KibanaFeatureScope.Spaces, KibanaFeatureScope.Security],
      app: [],
      order: FEATURE_ORDER,
      management: {
        kibana: ['workflowsManagement'],
      },
      privileges: {
        all: {
          app: [],
          api: [],
          management: {
            kibana: ['workflowsManagement'],
          },
          savedObject: {
            all: ['workflows', 'workflow_executions'],
            read: [],
          },
          ui: ['create', 'update', 'delete', 'read', 'execute'],
        },
        read: {
          app: [],
          api: [],
          management: {
            kibana: ['workflowsManagement'],
          },
          savedObject: {
            all: [],
            read: ['workflows', 'workflow_executions'],
          },
          ui: ['read'],
        },
      },
      subFeatures: [
        {
          name: i18n.translate(
            'platform.plugins.shared.workflows_management.featureRegistry.workflowsManagementSubFeatureName',
            {
              defaultMessage: 'Workflows Actions',
            }
          ),
          privilegeGroups: [
            {
              groupType: 'independent',
              privileges: [
                {
                  api: ['workflow:create'],
                  id: 'workflow_create',
                  name: i18n.translate(
                    'platform.plugins.shared.workflows_management.featureRegistry.createWorkflowSubFeaturePrivilege',
                    {
                      defaultMessage: 'Create',
                    }
                  ),
                  includeIn: 'all',
                  savedObject: {
                    all: ['workflow'],
                    read: [],
                  },
                  ui: ['createWorkflow'],
                },
                {
                  api: ['workflow:update'],
                  id: 'workflow_update',
                  name: i18n.translate(
                    'platform.plugins.shared.workflows_management.featureRegistry.updateWorkflowSubFeaturePrivilege',
                    {
                      defaultMessage: 'Update',
                    }
                  ),
                  includeIn: 'all',
                  savedObject: {
                    all: ['workflow'],
                    read: [],
                  },
                  ui: ['updateWorkflow'],
                },
                {
                  api: ['workflow:delete'],
                  id: 'workflow_delete',
                  name: i18n.translate(
                    'platform.plugins.shared.workflows_management.featureRegistry.deleteWorkflowSubFeaturePrivilege',
                    {
                      defaultMessage: 'Delete',
                    }
                  ),
                  includeIn: 'all',
                  savedObject: {
                    all: ['workflow'],
                    read: [],
                  },
                  ui: ['deleteWorkflow'],
                },
                {
                  api: ['workflow:execute'],
                  id: 'workflow_execute',
                  name: i18n.translate(
                    'platform.plugins.shared.workflows_management.featureRegistry.executeWorkflowSubFeaturePrivilege',
                    {
                      defaultMessage: 'Execute',
                    }
                  ),
                  includeIn: 'all',
                  savedObject: {
                    all: ['workflow_execution'],
                    read: ['workflow'],
                  },
                  ui: ['executeWorkflow'],
                },
                {
                  api: ['workflow:read'],
                  id: 'workflow_read',
                  name: i18n.translate(
                    'platform.plugins.shared.workflows_management.featureRegistry.readWorkflowSubFeaturePrivilege',
                    {
                      defaultMessage: 'Read',
                    }
                  ),
                  includeIn: 'all',
                  savedObject: {
                    read: ['workflow'],
                    all: [],
                  },
                  ui: ['readWorkflow'],
                },
                {
                  api: ['workflow_execution:read'],
                  id: 'workflow_execution_read',
                  name: i18n.translate(
                    'platform.plugins.shared.workflows_management.featureRegistry.readWorkflowExecutionSubFeaturePrivilege',
                    {
                      defaultMessage: 'Read Workflow Execution',
                    }
                  ),
                  includeIn: 'all',
                  savedObject: {
                    read: ['workflow_execution'],
                    all: [],
                  },
                  ui: ['readWorkflowExecution'],
                },
              ],
            },
          ],
        },
      ],
    });

    this.logger.debug('Workflows Management: Creating router');
    const router = core.http.createRouter();

    this.logger.debug('Workflows Management: Creating workflows service');

    // Get ES client from core
    const esClientPromise = core
      .getStartServices()
      .then(([coreStart]) => coreStart.elasticsearch.client.asInternalUser);

    // Get saved objects client from core
    const getSavedObjectsClient = () =>
      core
        .getStartServices()
        .then(([coreStart]) => coreStart.savedObjects.createInternalRepository());

    this.workflowsService = new WorkflowsService(
      esClientPromise,
      this.logger,
      getSavedObjectsClient,
      WORKFLOWS_EXECUTIONS_INDEX,
      WORKFLOWS_STEP_EXECUTIONS_INDEX,
      WORKFLOWS_EXECUTION_LOGS_INDEX
    );
    this.api = new WorkflowsManagementApi(this.workflowsService);

    // Register server side APIs
    defineRoutes(router, this.api);

    return {
      management: this.api,
    };
  }

  public start(core: CoreStart, plugins: WorkflowsExecutionEnginePluginStartDeps) {
    this.logger.info('Workflows Management: Start');

    this.unsecureActionsClient = plugins.actions.getUnsecuredActionsClient();

    // Initialize workflow task scheduler with the start contract
    this.workflowTaskScheduler = new WorkflowTaskScheduler(this.logger, plugins.taskManager);

    // Set task scheduler in workflows service
    if (this.workflowsService) {
      this.workflowsService.setTaskScheduler(this.workflowTaskScheduler);
    }

    const actionsTypes = plugins.actions.getAllTypes();
    this.logger.debug(`Available action types: ${actionsTypes.join(', ')}`);

    this.logger.debug('Workflows Management: Creating scheduler service');
    this.schedulerService = new SchedulerService(
      this.logger,
      this.workflowsService!,
      this.unsecureActionsClient!,
      plugins.workflowsExecutionEngine
    );
    this.api!.setSchedulerService(this.schedulerService!);

    this.logger.debug('Workflows Management: Started');

    return {
      // TODO: use api abstraction instead of schedulerService methods directly
      pushEvent: this.schedulerService!.pushEvent.bind(this.schedulerService),
      runWorkflow: this.schedulerService!.runWorkflow.bind(this.schedulerService),
    };
  }

  public stop() {}
}
