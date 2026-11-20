/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ACTIONS_CONNECTORS_SETTINGS_ID,
  type ActionsTaskProcessSettings,
} from '@kbn/actions-plugin/server/task_types/task_process_settings';
import type {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import { DATA_VIEWS_TASK_PROCESS_SETTINGS_ID } from '@kbn/data-views-plugin/server';
import { FIELDS_METADATA_TASK_PROCESS_SETTINGS_ID } from '@kbn/fields-metadata-plugin/server';
import type {
  TaskTypeModule,
  TaskTypeRegistrationOptions,
} from '@kbn/task-manager-plugin/server/task_type_module';
import type { TelemetryTaskProcessSettings } from '@kbn/telemetry-plugin/server/task_process_settings';
import { WorkflowRepository } from '@kbn/workflows';
import type { WorkflowsExecutionEngineConfig } from './config';
import { createWorkflowRuntime } from './create_workflow_runtime';
import type { WorkflowRuntime } from './create_workflow_runtime';
import { registerWorkflowDataStreams } from './data_streams';
import { ensureWorkflowsDataStreamsRolledOver } from './lib/data_streams/ensure_data_streams_rolled_over';
import { WorkflowExecutionTelemetryClient } from './lib/telemetry/workflow_execution_telemetry_client';
import { WorkflowsMeteringService } from './metering/metering_service';
import { createDataClientBundle, type DataClientBundle } from './repositories/data_access_layer';
import { WORKFLOW_SERVICE_ACCOUNT_TYPE } from './service_account_execution';
import { resolveWorkflowWorkloads } from './service_account_workload_resolver';
import { WORKFLOW_WORKLOAD_TYPE_NAME } from './task_plugin';
import { WORKFLOWS_EXECUTION_ENGINE_TASK_PROCESS_SETTINGS_ID } from './task_process_settings';
import { WORKFLOWS_USAGE_API_SETTINGS_ID } from './task_types/constants';
import { DATA_SEARCH_TASK_PROCESS_SETTINGS_ID } from './task_types/data_search_task_process_settings';
import { taskType as resumeTaskType } from './task_types/workflow_resume.task';
import { taskType as runTaskType } from './task_types/workflow_run.task';
import { taskType as scheduledTaskType } from './task_types/workflow_scheduled.task';
import type {
  RegisterHostedTaskTypeOptions,
  WorkflowsExecutionEnginePluginSetup,
  WorkflowsExecutionEnginePluginSetupDeps,
  WorkflowsExecutionEnginePluginStart,
  WorkflowsExecutionEnginePluginStartDeps,
} from './types';
import type { WorkflowCloudInfo } from './workflow_core_services';

interface SetupDependencies {
  cloudSetup: WorkflowCloudInfo | undefined;
}

/**
 * The plugin owns what only Kibana does: registering the task types, the data streams, the service
 * account workload and the telemetry events, installing the execution indices and rolling the data
 * streams over. Everything a run does lives in the workflow runtime (`createWorkflowRuntime`), which
 * the plugin builds from Kibana's services the first time something needs it.
 */
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
  private setupDependencies?: SetupDependencies;
  private coreSetup?: CoreSetup<
    WorkflowsExecutionEnginePluginStartDeps,
    WorkflowsExecutionEnginePluginStart
  >;
  private meteringService?: WorkflowsMeteringService;
  private dataClientBundle!: DataClientBundle;

  /** One runtime per Kibana node, built from `start()`'s services (or `getStartServices` if a task comes first). */
  private runtimePromise?: Promise<WorkflowRuntime>;
  /** What a task process may be told: the engine's own, and (from `start`) what the step plugins register. */
  private readonly taskTypeSettings: NonNullable<TaskTypeRegistrationOptions['settings']> = {};
  private readonly taskTypeParity: NonNullable<TaskTypeRegistrationOptions['parity']> = {};

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
      name: WORKFLOW_WORKLOAD_TYPE_NAME,
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

    // What a task process that schedules workflows (such as a rule that runs workflows) reads of this plugin.
    plugins.alerting?.registerTaskProcessSettings(
      WORKFLOWS_EXECUTION_ENGINE_TASK_PROCESS_SETTINGS_ID,
      () => this.config
    );

    // The logs, trigger events and (for `data_stream` storage) execution data streams, from the one
    // module that lists the definitions.
    registerWorkflowDataStreams(core, config.storage);

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

    // The three task types are modules: the plugin hands them its runtime (`host.plugins`), a task
    // process builds its own from its host. What a process may be told is registered here.
    const taskTypeOptions: TaskTypeRegistrationOptions = {
      logger: this.logger,
      hostExtensions: {
        plugins: async () => ({ workflowsExecutionEngine: { runtime: await this.getRuntime() } }),
        encryptedSavedObjects: async () => {
          const [, start] = await core.getStartServices();
          const eso = start.encryptedSavedObjects;
          if (!eso) throw new Error('Encrypted saved objects are not available');
          return {
            getClient: eso.getClient,
            isEncryptionError: eso.isEncryptionError,
            canEncrypt: plugins.encryptedSavedObjects?.canEncrypt ?? false,
          };
        },
        getEncryptionKeys: () =>
          plugins.encryptedSavedObjects?.getKeysForTaskProcesses() ?? { decryptionOnlyKeys: [] },
        // Kibana hands the runtime its own services; the event log is only read in a task process.
        eventLog: plugins.eventLog ?? {
          registerProviderActions: () => {},
          getLogger: () => {
            throw new Error('The event log is not available');
          },
        },
      },
      settings: this.taskTypeSettings,
      parity: this.taskTypeParity,
      // Packs were resolved once at schedule time (`resolveWorkflowTaskPacks`) and persisted on
      // the task instance's params, so this is a pure, synchronous read: no Elasticsearch call
      // between a run being due and a worker being acquired.
      getPacks: (taskInstance) => (taskInstance.params as { packs?: string[] } | undefined)?.packs,
    };
    Object.assign(this.taskTypeSettings, {
      workflowsExecutionEngine: () => this.config,
      workflowsExecutionEngineCloud: () => {
        const cloudSetup = this.setupDependencies?.cloudSetup;
        return cloudSetup
          ? {
              kibanaUrl: cloudSetup.kibanaUrl,
              serverless: cloudSetup.serverless,
              deploymentId: cloudSetup.deploymentId,
              csp: cloudSetup.csp,
              region: cloudSetup.region,
              elasticsearchClusterId: cloudSetup.elasticsearchClusterId,
            }
          : null;
      },
      security: () => plugins.security?.getTaskProcessSettings() ?? null,
      // What a process reports metering with: the Usage API connection, only when Kibana reports
      // metering at all (the same condition as `this.meteringService`).
      [WORKFLOWS_USAGE_API_SETTINGS_ID]: () =>
        plugins.usageApi?.usageReporting
          ? {
              url: plugins.usageApi.config.url,
              tls: plugins.usageApi.config.tls,
            }
          : null,
      actions: () => plugins.actions?.getConfig(),
      ...(plugins.fieldsMetadata
        ? {
            [FIELDS_METADATA_TASK_PROCESS_SETTINGS_ID]: () =>
              plugins.fieldsMetadata?.getTaskProcessSettings(),
          }
        : {}),
      // Kibana's final connectors as it has them now, not rebuilt from the config.
      [ACTIONS_CONNECTORS_SETTINGS_ID]: (): ActionsTaskProcessSettings => ({
        inMemoryConnectors: plugins.actions?.getTaskProcessSettings().inMemoryConnectors ?? [],
      }),
    });
    // How a process ships analytics events and counts usage, as this Kibana does: the process does
    // its side effects itself, so it is told what Kibana would apply.
    if (plugins.data) {
      this.taskTypeSettings[DATA_SEARCH_TASK_PROCESS_SETTINGS_ID] = async () => {
        const [, startPlugins] = await core.getStartServices();
        const search = startPlugins.data?.search.getTaskProcessSettings?.();
        if (!search)
          throw new Error('Native workflow search requires Data search runtime metadata');
        return {
          multiSearchDocLink: core.docLinks.links.apis.multiSearch,
          search,
          docLinks: {
            links: {
              query: { luceneQuery: core.docLinks.links.query.luceneQuery },
              apis: {
                searchPreference: core.docLinks.links.apis.searchPreference,
                multiSearch: core.docLinks.links.apis.multiSearch,
              },
              date: { dateMath: core.docLinks.links.date.dateMath },
              elasticsearch: { sortSearch: core.docLinks.links.elasticsearch.sortSearch },
              kibana: {
                autocompleteSuggestions: core.docLinks.links.kibana.autocompleteSuggestions,
              },
            },
          },
        };
      };
    }
    const { dataViews } = plugins;
    if (dataViews) {
      this.taskTypeSettings[DATA_VIEWS_TASK_PROCESS_SETTINGS_ID] = () =>
        dataViews.getTaskProcessSettings();
    }
    if (plugins.telemetry?.getTaskProcessSettings) {
      const { telemetry } = plugins;
      let license: TelemetryTaskProcessSettings['license'];
      plugins.licensing?.license$.subscribe((next) => {
        license = { uid: next.uid, status: next.status, type: next.type };
      });
      this.taskTypeSettings.telemetry = () => ({
        ...telemetry.getTaskProcessSettings(),
        license,
        cloud: plugins.cloud?.analyticsMetadata,
      });
    }
    if (plugins.usageCollection?.getTaskProcessSettings) {
      const { usageCollection } = plugins;
      this.taskTypeSettings.usageCollection = () => usageCollection.getTaskProcessSettings();
    }
    for (const [id, getSettings] of Object.entries(this.taskTypeSettings)) {
      plugins.alerting?.registerTaskProcessSettings(id, getSettings);
    }
    for (const taskType of [runTaskType, resumeTaskType, scheduledTaskType]) {
      plugins.taskManager.registerTaskType(taskType, taskTypeOptions);
    }

    return {
      registerHostedTaskType: (module: TaskTypeModule, options?: RegisterHostedTaskTypeOptions) => {
        plugins.taskManager.registerTaskType(module, {
          ...taskTypeOptions,
          hostExtensions: { ...taskTypeOptions.hostExtensions, plugins: options?.plugins },
        });
      },
    } satisfies WorkflowsExecutionEnginePluginSetup;
  }

  public start(coreStart: CoreStart, plugins: WorkflowsExecutionEnginePluginStartDeps) {
    this.logger.debug('workflows-execution-engine: Start');

    if (!this.setupDependencies) {
      throw new Error('Setup not called before start');
    }

    // The configs the steps of other plugins read in a task process: their getters are registered
    // during their `setup()`, and read when a process starts.
    Object.assign(this.taskTypeSettings, plugins.workflowsExtensions.getTaskProcessSettings());
    // What the registries of other plugins hold, which a process compares with its own.
    Object.assign(this.taskTypeParity, plugins.workflowsExtensions.getTaskProcessParity());

    void this.dataClientBundle.initStart(coreStart);

    void ensureWorkflowsDataStreamsRolledOver(
      this.logger.get('data-stream-rollover'),
      coreStart.elasticsearch.client.asInternalUser
    );

    const runtime = this.buildRuntime(coreStart, plugins);
    this.runtimePromise = Promise.resolve(runtime);
    return runtime.contract;
  }

  public stop() {
    void this.dataClientBundle.stop();
  }

  /** Kibana's services, as the explicit dependencies of the runtime. */
  private buildRuntime(
    coreStart: CoreStart,
    plugins: WorkflowsExecutionEnginePluginStartDeps
  ): WorkflowRuntime {
    return createWorkflowRuntime({
      logger: this.logger,
      config: this.config,
      elasticsearch: coreStart.elasticsearch,
      security: coreStart.security,
      userProfile: coreStart.userProfile,
      http: coreStart.http,
      analytics: coreStart.analytics,
      dataStreams: coreStart.dataStreams,
      featureFlags: coreStart.featureFlags,
      spaces: plugins.spaces?.spacesService,
      actions: plugins.actions,
      taskManager: plugins.taskManager,
      workflowsExtensions: plugins.workflowsExtensions,
      licensing: plugins.licensing,
      dataClients: this.dataClientBundle,
      metering: this.meteringService,
      cloud: this.setupDependencies?.cloudSetup,
    });
  }

  /** The runtime of this node; built from the start services when a task runs before `start()` returns. */
  public getRuntime(): Promise<WorkflowRuntime> {
    if (!this.runtimePromise) {
      const { coreSetup } = this;
      if (!coreSetup) {
        return Promise.reject(new Error('Setup not called before the runtime was needed'));
      }
      this.runtimePromise = coreSetup
        .getStartServices()
        .then(([coreStart, plugins]) => this.buildRuntime(coreStart, plugins));
    }
    return this.runtimePromise;
  }
}
