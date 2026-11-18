/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { firstValueFrom } from 'rxjs';
import { ACTIONS_FEATURE_ID } from '@kbn/actions-plugin/common';
import type { ActionsConfig } from '@kbn/actions-plugin/server/config';
import { EVENT_LOG_PROVIDER as ACTIONS_EVENT_LOG_PROVIDER } from '@kbn/actions-plugin/server/constants/event_log';
import { createRuleRunActions } from '@kbn/actions-plugin/server/task_types/rule_run_actions';
import {
  ACTIONS_CONNECTORS_SETTINGS_ID,
  type ActionsTaskProcessSettings,
} from '@kbn/actions-plugin/server/task_types/task_process_settings';
import { ConnectorAdapterRegistry } from '@kbn/alerting-plugin/server/connector_adapters/connector_adapter_registry';
import type { AlertStatusChangedOptIn } from '@kbn/alerting-plugin/server/lib/workflow_extensions/alert_status_changed_opt_in';
import type {
  RuleRunContribution,
  RuleRunRegistries,
} from '@kbn/alerting-plugin/server/task_types/rule_run_contribution';
import type { KibanaRequest, SecurityServiceStart } from '@kbn/core/server';
import type { IEventLogger } from '@kbn/event-log-plugin/server';
import { kibanaPackageJson } from '@kbn/repo-info';
import type { SecurityTaskPluginStart } from '@kbn/security-plugin/server/task_plugin';
import { createParityGuard } from '@kbn/task-manager-plugin/server/task_process/parity';
import { registerRunFlusher } from '@kbn/task-manager-plugin/server/task_process/run_context';
import type { TaskHost } from '@kbn/task-manager-plugin/server/task_type_module';
import { UsageReportingService } from '@kbn/usage-api-plugin/server/usage_reporting';
import type { UsageReportingConfig } from '@kbn/usage-api-plugin/server/usage_reporting';
import { SystemConnectorsMap } from '@kbn/workflows';
import {
  createEventChainContextStore,
  createServerStepRegistry,
} from '@kbn/workflows-extensions/server';
import type {
  WorkflowStepRunCheck,
  WorkflowStepsContribution,
  WorkflowStepsContributionContext,
  WorkflowStepsContributionServices,
} from '@kbn/workflows-extensions/server';
import {
  RULE_RUN_CONTRIBUTIONS_KEY,
  WORKFLOW_STEPS_CONTRIBUTIONS_KEY,
  WORKFLOWS_ENGINE_CLOUD_SETTINGS_ID,
  WORKFLOWS_ENGINE_SETTINGS_ID,
  WORKFLOWS_USAGE_API_SETTINGS_ID,
} from './constants';
import { WorkflowRuntimeServices } from './workflow_runtime_services';
import type { WorkflowsExecutionEngineConfig } from '../config';
import { createWorkflowRuntime } from '../create_workflow_runtime';
import type { WorkflowRuntime } from '../create_workflow_runtime';
import { assertRunnableInProcessPreflight } from '../lib/assert_runnable_in_process';
import { createRetryingEsClient } from '../lib/create_retrying_es_client';
import type { WorkflowMeteringCloud } from '../metering';
import { WorkflowsMeteringService } from '../metering/metering_service';
import { initializeDataStreamDataClients } from '../repositories/data_access_layer/implementations/data_stream/data_stream_data_client_bundle';
import { createPlainIndexDataClients } from '../repositories/data_access_layer/implementations/plain_index/plain_index_data_client_bundle';
import { ExecutionIdentityContexts } from '../service_account_execution';
import { HitlLifecycleAuditRegistry } from '../step/wait_for_input_step/hitl_lifecycle_auditor';
import type { WorkflowsEngineTaskPluginStart } from '../task_plugin';
import type { WorkflowCoreStart } from '../workflow_core_services';

/**
 * The workflow runtime a task process runs, built from the task host: what Kibana builds from Core
 * and the plugins, built from the host's services. Core initializes owned data streams lazily.
 */
export const createWorkflowRuntimeFromHost = async (
  taskHost: TaskHost
): Promise<{
  runtime: WorkflowRuntime;
  getService: <T extends object>(id: string) => T;
  stop: () => Promise<void>;
}> => {
  const enginePlugin = taskHost.plugins?.workflowsExecutionEngine as
    | WorkflowsEngineTaskPluginStart
    | undefined;
  if (!enginePlugin)
    throw new Error('The workflow engine task plugin is required by the workflow runtime');
  const host: TaskHost = {
    ...taskHost,
    // These services belong to one workflow execution; Core's hooks survive worker reuse.
    onRunEnd: (flusher) => {
      if (!registerRunFlusher(flusher)) taskHost.onRunEnd?.(flusher);
    },
  };
  const settings = host.settings ?? {};
  const config = settings[WORKFLOWS_ENGINE_SETTINGS_ID] as WorkflowsExecutionEngineConfig;
  const actionsConfig = settings.actions as ActionsConfig;
  const cloud = settings[WORKFLOWS_ENGINE_CLOUD_SETTINGS_ID] as
    | (WorkflowMeteringCloud & { kibanaUrl?: string })
    | undefined;
  const { logger } = host;
  const { featureFlags, userProfile, taskManager, licensing, encryptedSavedObjects, eventLog } =
    host;
  if (!config)
    throw new Error('The task process was not given the settings of the workflows engine');
  if (!featureFlags) throw new Error('The workflows task module did not get feature flags');
  if (!userProfile) throw new Error('The task process host did not lend Core user profile service');
  if (!taskManager) throw new Error('The workflows task module did not get task scheduling');
  if (!licensing) throw new Error('The workflows task module did not get the license');
  if (!encryptedSavedObjects) {
    throw new Error('The workflows task module did not get encrypted saved objects');
  }
  if (!eventLog) throw new Error('The workflows task module did not get the event log');

  const stops: Array<() => void | Promise<void>> = [];
  const stopServices = async () => {
    const results = await Promise.allSettled(stops.map(async (cleanup) => cleanup()));
    const errors = results
      .filter((result) => result.status === 'rejected')
      .map((result) => result.reason);
    if (errors.length)
      throw new AggregateError(errors, 'Failed to stop workflow execution services');
  };
  const esClient = createRetryingEsClient(host.elasticsearch.asInternalUser, logger);

  const { dataStreams } = host;
  if (!dataStreams) throw new Error('The workflow task module requires native Core data streams');

  // Execution storage: the clients of the indices or data streams Kibana installed.
  let dataClients: WorkflowRuntimeDataClients;
  if (config.storage.source === 'data_stream') {
    const clients = await initializeDataStreamDataClients({ esClient, logger, dataStreams });
    stops.push(clients.stop);
    dataClients = clients;
  } else {
    dataClients = {
      createWorkflowDataClient: () =>
        createPlainIndexDataClients({ esClient, logger }).workflowExecutionsDataClient,
      createStepDataClient: () =>
        createPlainIndexDataClients({ esClient, logger }).stepExecutionsDataClient,
    };
  }

  const workflowsExtensions = createServerStepRegistry(logger);

  // Connectors: the actions of the process, with the connector types the plugins contribute.
  const connectorContributions = (host.contributions?.[RULE_RUN_CONTRIBUTIONS_KEY] ??
    []) as RuleRunContribution[];
  const connectorAdapters = new ConnectorAdapterRegistry();
  const alertStatusChangedOptIns: AlertStatusChangedOptIn[] = [];
  const { actionsPlugin, hasActionType, getActionTypeIds, stop } = createRuleRunActions({
    logger: logger.get('plugins', 'actions'),
    config: actionsConfig,
    getSystemIdentity: () =>
      (host.plugins?.security as SecurityTaskPluginStart | undefined)?.authc.systemIdentity,
    license$: licensing.license$,
    elasticsearch: host.elasticsearch,
    savedObjects: host.savedObjects,
    getEncryptedSavedObjectsClient: encryptedSavedObjects.getClient,
    taskManager: taskManager as never,
    publicBaseUrl: host.server.publicBaseUrl,
    // Kibana's final connectors, not rebuilt from the config.
    inMemoryConnectors: (
      settings[ACTIONS_CONNECTORS_SETTINGS_ID] as ActionsTaskProcessSettings | undefined
    )?.inMemoryConnectors,
    usageCounter: host.usageCounters?.getUsageCounter(ACTIONS_FEATURE_ID),
    featureUsage: licensing.featureUsage,
    authorization: (host.plugins?.security as { authz?: never } | undefined)?.authz,
    getAuditLoggerWithRequest: (request) => host.security.audit.asScoped(request),
    executor: {
      security: host.security as SecurityServiceStart,
      eventLogger: eventLog.getLogger({
        event: { provider: ACTIONS_EVENT_LOG_PROVIDER },
      }) as IEventLogger,
      analyticsService: host.analytics as never,
      createInternalRepository: host.savedObjects.createInternalRepository,
    },
    registerConnectorTypes: (actions) => {
      const registries: RuleRunRegistries = {
        actions,
        alerting: {
          registerConnectorAdapter: (adapter) => connectorAdapters.register(adapter),
          enableAlertStatusChanged: (optIn) => {
            alertStatusChangedOptIns.push(optIn);
          },
        },
      };
      connectorContributions.forEach((contribution) =>
        contribution.register?.(registries, {
          logger,
          isServerless: host.server.isServerless,
          kibanaVersion: host.server.version,
          publicBaseUrl: host.server.publicBaseUrl,
          settings,
          host,
          getService: <T extends object>(id: string): T => runServices.getService<T>(id),
        })
      );
    },
  });
  stops.push(stop);
  // `connectorTypes` is the only kind checked here: every process registers every connector type
  // unconditionally (packs never narrow it), so Kibana having one a process lacks is a genuine
  // build/registration gap and every run of this process should decline. Step and trigger
  // definitions are deliberately narrowed by packs per process, so comparing them against Kibana's
  // full registries here would decline every run of every pack-scoped process, not just the runs
  // that actually need what is missing; `assertRunnableInProcessPreflight` below already declines
  // exactly those runs, scoped to the one workflow definition being run.
  const checkParity = createParityGuard({
    taskType: 'workflow',
    logger,
    expected: host.parity,
    hooks: [{ kind: 'connectorTypes', getIds: getActionTypeIds }],
  });

  // Steps: the internal ones (registered with the registry), and what the plugins contribute, which
  // may use the actions and the runtime of the engine, read when a step runs.
  const runChecks: WorkflowStepRunCheck[] = [];
  const stepContributions = (host.contributions?.[WORKFLOW_STEPS_CONTRIBUTIONS_KEY] ??
    []) as WorkflowStepsContribution[];
  const engineReady = Promise.withResolvers<WorkflowRuntime['contract']>();
  // The registry may be unused, but registration failures must reject every service waiting for it.
  void engineReady.promise.catch(() => {});
  const runServices = new WorkflowRuntimeServices(stepContributions, () => context, {
    actions: actionsPlugin,
  });
  const services: WorkflowStepsContributionServices = {
    registerRunCompletion: runServices.registerRunCompletion,
    stepRegistry: workflowsExtensions,
    registerService: runServices.registerService,
    getService: runServices.getService,
    getExecutionEngine: async <T extends object>(): Promise<T> => (await engineReady.promise) as T,
    getUnsecuredActionsClient: actionsPlugin.getUnsecuredActionsClient,
    executionDataClients: dataClients,
    getActionsClientWithRequest: (request) => actionsPlugin.getActionsClientWithRequest(request),
    scheduleWorkflow: async (workflow, workflowContext, request) =>
      (await engineReady.promise).scheduleWorkflow(workflow as never, workflowContext, request),
    emitEvent: async (params) => (await engineReady.promise).triggerEvents.emitEvent(params),
  };
  const context: WorkflowStepsContributionContext = {
    host,
    logger,
    isServerless: host.server.isServerless,
    kibanaVersion: host.server.version,
    publicBaseUrl: host.server.publicBaseUrl,
    settings,
    registerRunCheck: (check) => runChecks.push(check),
    hasStepDefinition: (stepTypeId) => workflowsExtensions.hasStepDefinition(stepTypeId),
    services,
  };
  try {
    await Promise.all(
      stepContributions.map((contribution) => contribution.register(workflowsExtensions, context))
    );
  } catch (error) {
    engineReady.reject(error);
    await stopServices();
    throw error;
  }

  // Links are built from Kibana's own public base URL (Core's `publicBaseUrl` is where the process
  // reaches Kibana), and calls go to `kibanaUrl`.
  const { basePath } = host.http;
  const http: WorkflowCoreStart['http'] = {
    selfClient: host.http.selfClient,
    getServerInfo: host.http.getServerInfo,
    kibanaUrl: basePath.publicBaseUrl,
    basePath: {
      serverBasePath: basePath.serverBasePath,
      publicBaseUrl: host.server.publicBaseUrl,
      get: basePath.get.bind(basePath),
      prepend: basePath.prepend.bind(basePath),
      remove: basePath.remove.bind(basePath),
    },
  };

  const usageApiSettings = settings[WORKFLOWS_USAGE_API_SETTINGS_ID] as
    | { url?: string; tls?: UsageReportingConfig['tls'] }
    | null
    | undefined;
  let metering: WorkflowsMeteringService | undefined;
  if (usageApiSettings?.url) {
    metering = new WorkflowsMeteringService(
      new UsageReportingService({
        config: { enabled: true, url: usageApiSettings.url, tls: usageApiSettings.tls },
        kibanaVersion: kibanaPackageJson.version,
        logger: logger.get('usageApi', 'usageReporting'),
      }),
      logger.get('workflowsMetering')
    );
    const meteringService = metering;
    host.onRunEnd?.(() => meteringService.flush());
  }

  let runtime: WorkflowRuntime;
  try {
    runtime = createWorkflowRuntime({
      state: {
        identityContexts: new ExecutionIdentityContexts(),
        // HTTP steps and plugin helpers read this request-local symbol too.
        eventChainContext: createEventChainContextStore(),
        hitlLifecycle: new HitlLifecycleAuditRegistry(),
      },
      logger,
      config,
      elasticsearch: { client: host.elasticsearch },
      security: {
        authc: host.security.authc,
        audit: host.security.audit,
        // The engine plugin's own: the workload bindings are scoped to the plugin that registered the type.
        serviceAccounts: enginePlugin.serviceAccounts,
      },
      userProfile,
      http,
      analytics: host.analytics,
      dataStreams,
      featureFlags,
      // A run has one space: the one its request names.
      spaces: {
        getSpaceId: (request: KibanaRequest) =>
          (request as { spaceId?: string } | undefined)?.spaceId ?? 'default',
      } as never,
      actions: { getActionsClientWithRequest: actionsPlugin.getActionsClientWithRequest },
      taskManager: taskManager as never,
      workflowsExtensions,
      licensing: { getLicense: () => firstValueFrom(licensing.license$) as never },
      dataClients,
      // The process meters itself, with the Usage API connection Kibana sent (none when Kibana does
      // not meter), and finishes sending before it answers.
      metering,
      // `canRunAs` is the default: the process's security plugin serves the service accounts from the
      // same bindings and credentials as Kibana (`serviceAccounts.enabled` says whether it does).
      cloud,
      preflight: async (preflightContext) => {
        await checkParity(host);
        await assertRunnableInProcessPreflight(preflightContext);
      },
      checkStep: (step) => {
        for (const check of runChecks) {
          const reason = check(step);
          if (reason) return reason;
        }
        return undefined;
      },
      // A connector step (`ConnectorStepImpl`) is `<connector type>` or `<connector type>.<sub action>`,
      // where the connector type is an action type id without its dot (`webhook`, `slack`, `cases`).
      // `console` is answered by the step itself. The `http` step runs as the `.http` system connector.
      //
      // The engine runs a step as a connector when it names a `connector-id`, or when it is a system
      // connector (`http`). A step that does neither is a custom step, so one missing from the registry
      // (a plugin whose steps this process does not have, such as `cases.addAlerts`) is declined and
      // never mistaken for a connector whose type shares its prefix.
      isConnectorStepType: ({ type, config: stepConfig }) => {
        if (type === 'console') return true;
        const [base] = type.split('.');
        const knownConnector = hasActionType(`.${base}`) || hasActionType(base);
        if (!knownConnector) return false;
        return (
          typeof stepConfig['connector-id'] === 'string' || SystemConnectorsMap.has(`.${type}`)
        );
      },
    });
  } catch (error) {
    engineReady.reject(error);
    await stopServices();
    throw error;
  }
  engineReady.resolve(runtime.contract);

  return {
    runtime,
    getService: runServices.getService,
    stop: async () => {
      try {
        await runServices.complete();
      } finally {
        await stopServices();
      }
    },
  };
};

type WorkflowRuntimeDataClients = Parameters<typeof createWorkflowRuntime>[0]['dataClients'];
