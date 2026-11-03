/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import { WorkflowRepository } from '@kbn/workflows';
import type { EsWorkflowExecution, WorkflowSettings } from '@kbn/workflows';
import type { ConcurrencyManager } from './concurrency/concurrency_manager';
import type { WorkflowsExecutionEngineConfig } from './config';
import { createScopedRepositories, createWorkflowsEngineRuntime } from './engine_runtime';
import { ensureWorkflowsDataStreamsRolledOver } from './lib/data_streams/ensure_data_streams_rolled_over';
import { WorkflowExecutionTelemetryClient } from './lib/telemetry/workflow_execution_telemetry_client';
import { WorkflowsMeteringService } from './metering/metering_service';
import { createDataClientBundle, type DataClientBundle } from './repositories/data_access_layer';
import { initializeLogsRepositoryDataStream } from './repositories/logs_repository/data_stream';
import { checkConcurrencyIfNeeded, getConcurrencyGroupKey } from './scheduling';
import { WORKFLOW_SERVICE_ACCOUNT_TYPE } from './service_account_execution';
import { resolveWorkflowWorkloads } from './service_account_workload_resolver';
import { registerWorkflowTaskDefinitions } from './task_runners';
import { workflowsExecutionEngineBridge } from './tasks/bridge';
import { initializeTriggerEventsDataStream } from './trigger_events';
import type {
  InternalResumeWorkflowExecution,
  WorkflowsExecutionEnginePluginSetup,
  WorkflowsExecutionEnginePluginSetupDeps,
  WorkflowsExecutionEnginePluginStart,
  WorkflowsExecutionEnginePluginStartDeps,
} from './types';
import type { ContextDependencies } from './workflow_context_manager/types';

type SetupDependencies = Pick<ContextDependencies, 'cloudSetup'>;

export class WorkflowsExecutionEnginePlugin
  implements
    Plugin<
      WorkflowsExecutionEnginePluginSetup,
      WorkflowsExecutionEnginePluginStart,
      WorkflowsExecutionEnginePluginSetupDeps,
      WorkflowsExecutionEnginePluginStartDeps
    >
{
  private readonly logger: Logger;
  private readonly config: WorkflowsExecutionEngineConfig;
  private concurrencyManager!: ConcurrencyManager;
  private setupDependencies?: SetupDependencies;
  private coreSetup?: CoreSetup<
    WorkflowsExecutionEnginePluginStartDeps,
    WorkflowsExecutionEnginePluginStart
  >;
  private meteringService?: WorkflowsMeteringService;

  /** Set in start(); used by task runners to pass parent-resume into run/resume without exposing it on the public plugin contract. */
  private internalResumeWorkflowExecutionHandler?: InternalResumeWorkflowExecution;

  private dataClientBundle!: DataClientBundle;

  private createScopedRepositories() {
    return createScopedRepositories(this.dataClientBundle);
  }

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.config = initializerContext.config.get<WorkflowsExecutionEngineConfig>();
  }

  public setup(
    core: CoreSetup<WorkflowsExecutionEnginePluginStartDeps, WorkflowsExecutionEnginePluginStart>,
    plugins: WorkflowsExecutionEnginePluginSetupDeps
  ) {
    this.logger.debug('Workflows execution engine setup');

    // Register telemetry event schemas
    WorkflowExecutionTelemetryClient.setup(core.analytics);

    const logger = this.logger;
    const config = this.config;

    this.coreSetup = core;
    core.security.serviceAccounts.registerWorkloadType({
      type: WORKFLOW_SERVICE_ACCOUNT_TYPE,
      name: 'Workflow',
      resolveWorkloads: async (workloads, options) => {
        const [coreStart] = await core.getStartServices();
        return resolveWorkflowWorkloads(
          new WorkflowRepository({
            esClient: coreStart.elasticsearch.client.asInternalUser,
            logger,
          }),
          workloads,
          options
        );
      },
    });

    initializeLogsRepositoryDataStream(core.dataStreams);
    initializeTriggerEventsDataStream(core.dataStreams);

    this.dataClientBundle = createDataClientBundle({
      source: config.storage.source,
      dataRetention: config.storage.dataRetention,
      logger: this.logger,
    });
    void this.dataClientBundle.initSetup(core);

    const setupDependencies: SetupDependencies = { cloudSetup: plugins.cloud };
    this.setupDependencies = setupDependencies;

    // Initialize metering from the centralized Usage API plugin
    if (plugins.usageApi?.usageReporting) {
      this.meteringService = new WorkflowsMeteringService(
        plugins.usageApi?.usageReporting,
        this.logger.get('workflowsMetering')
      );
      this.logger.debug('Workflows metering service initialized');
    } else {
      this.logger.debug(
        'Workflows metering service not initialized: Usage API plugin is not available or not configured'
      );
    }

    registerWorkflowTaskDefinitions({
      logger,
      config,
      registerTaskDefinitions: plugins.taskManager.registerTaskDefinitions,
      getStartServices: core.getStartServices,
      setupDependencies,
      meteringService: this.meteringService,
      createScopedRepositories: () => this.createScopedRepositories(),
      getInternalResumeWorkflowExecution: () => this.internalResumeWorkflowExecutionHandler,
      getConcurrencyGroupKey: (workflowExecution, workflowSettings, coreStart, dependencies) =>
        this.getConcurrencyGroupKey(workflowExecution, workflowSettings, coreStart, dependencies),
      checkConcurrencyIfNeeded: (workflowExecution) =>
        this.checkConcurrencyIfNeeded(workflowExecution),
    });

    workflowsExecutionEngineBridge.setSetup({ started: true });

    return {};
  }

  public start(coreStart: CoreStart, plugins: WorkflowsExecutionEnginePluginStartDeps) {
    this.logger.debug('workflows-execution-engine: Start');

    if (!this.setupDependencies) {
      throw new Error('Setup not called before start');
    }

    void this.dataClientBundle.initStart(coreStart);

    const esClient = coreStart.elasticsearch.client.asInternalUser;
    void ensureWorkflowsDataStreamsRolledOver(this.logger.get('data-stream-rollover'), esClient);

    const runtime = createWorkflowsEngineRuntime({
      logger: this.logger,
      config: this.config,
      coreStart,
      plugins,
      dataClientBundle: this.dataClientBundle,
      setupDependencies: this.setupDependencies,
      meteringService: this.meteringService,
      checkConcurrencyIfNeeded: (workflowExecution) =>
        this.checkConcurrencyIfNeeded(workflowExecution),
      getEngine: async () => {
        if (!this.coreSetup) {
          throw new Error('Core setup not available');
        }
        const [, , workflowsExecutionEngine] = await this.coreSetup.getStartServices();
        return workflowsExecutionEngine;
      },
    });
    this.concurrencyManager = runtime.concurrencyManager;
    this.internalResumeWorkflowExecutionHandler = runtime.internalResumeWorkflowExecution;
    workflowsExecutionEngineBridge.setStart(runtime.contract);
    return runtime.contract;
  }

  public stop() {
    void this.dataClientBundle.stop();
  }

  /**
   * Reused local wrapper for evaluating the concurrency group key for a workflow execution.
   * See `getConcurrencyGroupKey` in `./scheduling`.
   */
  private getConcurrencyGroupKey(
    workflowExecution: Partial<EsWorkflowExecution>,
    workflowSettings: WorkflowSettings | undefined,
    coreStart: CoreStart,
    dependencies: ContextDependencies
  ): string | null {
    return getConcurrencyGroupKey(
      { concurrencyManager: this.concurrencyManager, logger: this.logger },
      workflowExecution,
      workflowSettings,
      coreStart,
      dependencies
    );
  }

  /**
   * Checks concurrency limits and applies collision strategy if needed.
   * See `checkConcurrencyIfNeeded` in `./scheduling`.
   */
  private async checkConcurrencyIfNeeded(
    workflowExecution: Partial<EsWorkflowExecution>
  ): Promise<boolean> {
    return checkConcurrencyIfNeeded(
      { concurrencyManager: this.concurrencyManager, logger: this.logger },
      workflowExecution
    );
  }
}
