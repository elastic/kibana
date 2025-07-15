/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '@kbn/core/server';
import { Client } from '@elastic/elasticsearch';
import { IUnsecuredActionsClient } from '@kbn/actions-plugin/server';
import type { WorkflowsPluginSetup, WorkflowsPluginStart } from './types';
import { defineRoutes } from './workflows_management/workflows_management_routes';
import { WorkflowsManagementApi } from './workflows_management/workflows_management_api';
import { WorkflowsService } from './workflows_management/workflows_management_service';
import type { WorkflowsExecutionEnginePluginStartDeps } from './types';
import { SchedulerService } from './scheduler/scheduler_service';
import {
  WORKFLOWS_EXECU,
  WORKFLOWS_STEP_EXECUTIONS_INDEXTIONS_INDEX,
  WORKFLOWS_INDEX,
  WORKFLOWS_EXECUTIONS_INDEX,
  WORKFLOWS_STEP_EXECUTIONS_INDEX,
} from '../common';

export class WorkflowsPlugin implements Plugin<WorkflowsPluginSetup, WorkflowsPluginStart> {
  private readonly logger: Logger;
  private workflowsService: WorkflowsService | null = null;
  private schedulerService: SchedulerService | null = null;
  private unsecureActionsClient: IUnsecuredActionsClient | null = null;
  private api: WorkflowsManagementApi | null = null;
  // TODO: replace with esClient promise from core
  private esClient: Client = new Client({
    node: 'http://localhost:9200', // or your ES URL
    auth: {
      username: 'elastic',
      password: 'changeme',
    },
  });

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup) {
    this.logger.debug('Workflows Management: Setup');

    this.logger.debug('Workflows Management: Creating router');
    const router = core.http.createRouter();

    this.logger.debug('Workflows Management: Creating workflows service');
    this.workflowsService = new WorkflowsService(
      Promise.resolve(this.esClient),
      this.logger,
      WORKFLOWS_INDEX,
      WORKFLOWS_EXECUTIONS_INDEX,
      WORKFLOWS_STEP_EXECUTIONS_INDEX
    );
    this.api = new WorkflowsManagementApi(this.workflowsService);

    // Register server side APIs
    defineRoutes(router, this.api);

    return {
      management: this.api,
    };
  }

  public start(core: CoreStart, plugins: WorkflowsExecutionEnginePluginStartDeps) {
    this.logger.debug('Workflows Management: Start');

    this.unsecureActionsClient = plugins.actions.getUnsecuredActionsClient();

    const actionsTypes = plugins.actions.getAllTypes();
    console.log('actionsTypes', actionsTypes);

    this.logger.debug('Workflows Management: Creating scheduler service');
    this.schedulerService = new SchedulerService(
      this.logger,
      this.workflowsService!,
      this.unsecureActionsClient!,
      plugins.workflowsExecutionEngine
    );
    this.api!.setSchedulerService(this.schedulerService!);

    this.logger.debug('Workflows Management: Started');

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
      // TODO: use api abstraction instead of schedulerService methods directly
      pushEvent: this.schedulerService!.pushEvent.bind(this.schedulerService),
      runWorkflow: this.schedulerService!.runWorkflow.bind(this.schedulerService),
    };
  }

  public stop() {}
}
