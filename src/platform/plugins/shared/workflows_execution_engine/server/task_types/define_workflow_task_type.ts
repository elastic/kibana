/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EVENT_LOG_ACTIONS as ACTIONS_EVENT_LOG_ACTIONS,
  EVENT_LOG_PROVIDER as ACTIONS_EVENT_LOG_PROVIDER,
} from '@kbn/actions-plugin/server/constants/event_log';
import { events as actionsEventTypes } from '@kbn/actions-plugin/server/lib/event_based_telemetry';
import { getRuleRunDeclarations } from '@kbn/alerting-plugin/server/task_types/rule_run_saved_object_types';
import type { UiSettingsParams } from '@kbn/core-ui-settings-common';
import { createStandaloneEventLog } from '@kbn/event-log-plugin/server/standalone_event_log';
import { kibanaPackageJson } from '@kbn/repo-info';
import { createSecurityTaskPlugin } from '@kbn/security-plugin/server/task_plugin';
import type { CancellableTask, RunContext } from '@kbn/task-manager-plugin/server/task';
import { TASK_ENCRYPTED_SAVED_OBJECT_TYPE_REGISTRATIONS } from '@kbn/task-manager-plugin/server/task_process/host_capabilities/task_scheduling';
import { TASK_SCHEDULING_CONTRIBUTIONS_KEY } from '@kbn/task-manager-plugin/server/task_scheduling_contribution';
import type { TaskHost, TaskTypeModule } from '@kbn/task-manager-plugin/server/task_type_module';
import { defineTaskType } from '@kbn/task-manager-plugin/server/task_type_module';
import { createTelemetryTaskPlugin } from '@kbn/telemetry-plugin/server/task_plugin';
import { WORKFLOWS_CORE_SELF_CLIENT_ENABLED_FLAG } from '@kbn/workflows';
import type { WorkflowStepsContribution } from '@kbn/workflows-extensions/server';
import {
  AGENT_BUILDER_CONTRIBUTIONS_KEY,
  CASES_ATTACHMENT_TYPES_CONTRIBUTIONS_KEY,
  CASES_CLIENT_CONTRIBUTIONS_KEY,
  RULE_RUN_CONTRIBUTIONS_KEY,
  WORKFLOW_STEPS_CONTRIBUTIONS_KEY,
  WORKFLOWS_ENGINE_CLOUD_SETTINGS_ID,
  WORKFLOWS_ENGINE_SETTINGS_ID,
} from './constants';
import type { WorkflowsExecutionEngineConfig } from '../config';
import type { WorkflowRuntime, WorkflowTaskFunction } from '../create_workflow_runtime';
import { getWorkflowDataStreamDefinitions } from '../data_streams';
import { workflowExecutionEventSchemas } from '../lib/telemetry/events/workflows_execution';
import { createWorkflowsEngineTaskPlugin } from '../task_plugin';

/** The id of the engine's plugin, which a module reads the runtime of as `host.plugins[id]`. */
export const WORKFLOWS_ENGINE_PLUGIN_ID = 'workflowsExecutionEngine';

/** What the engine's task plugin (or, in Kibana, the plugin) hands a module as `host.plugins.workflowsExecutionEngine`. */
export interface WorkflowsEngineHostPlugin {
  /** Kibana: the runtime of the plugin. A process builds its own from the host. */
  runtime?: WorkflowRuntime;
}

// The connectors and their task params, and `alert`, which the actions client reads rule actions from.
const ACTION_SAVED_OBJECT_TYPES = new Set(['action', 'action_task_params', 'alert']);

const getPluginRuntime = (host: TaskHost): WorkflowRuntime | undefined =>
  (host.plugins?.[WORKFLOWS_ENGINE_PLUGIN_ID] as WorkflowsEngineHostPlugin | undefined)?.runtime;

/** Loaded here so that Kibana, which never gets here, does not load the process runtime module. */
const createWorkflowRuntimeFromHostLazy = async (host: TaskHost) => {
  const { createWorkflowRuntimeFromHost } = await import('./process_runtime');
  return createWorkflowRuntimeFromHost(host);
};

/**
 * What {@link defineWorkflowHostedTaskType}'s `getProcessRuntime` resolves to: the engine's process
 * runtime, its service registry (what `workflow-steps` and `agent-builder` contributions registered
 * while setting themselves up against it) and a `stop` to flush and release it, called from the
 * caller's own `cleanup`.
 */
export type ProcessWorkflowRuntime = Awaited<ReturnType<typeof createWorkflowRuntimeFromHostLazy>>;

/** Resolves the plugin runtime or creates the services of one process execution. */
const getRuntime = async (
  host: TaskHost
): Promise<{ runtime: WorkflowRuntime; stop?: () => Promise<void> }> => {
  const runtime = getPluginRuntime(host);
  if (runtime) return { runtime };
  return createWorkflowRuntimeFromHostLazy(host);
};

/**
 * Contributions of different plugins may declare the same setting (the steps and the tools of a plugin
 * read it): Core refuses to register a key twice, so the first definition of a key is the one kept.
 */
const dedupeUiSettings = <T extends Record<string, unknown>>(list: T[]): T[] => {
  const seen = new Set<string>();
  return list
    .map(
      (settings) =>
        Object.fromEntries(
          Object.entries(settings).filter(([key]) => !seen.has(key) && seen.add(key))
        ) as T
    )
    .filter((settings) => Object.keys(settings).length > 0);
};

/** What an `agent-builder` contribution adds to the module: the part of its `declares` the engine reads. */
export type AgentBuilderContributionDeclares = Pick<
  NonNullable<WorkflowStepsContribution['declares']>,
  | 'savedObjectTypes'
  | 'contributionKeys'
  | 'createSavedObjectTypes'
  | 'dataStreams'
  | 'encryptedSavedObjectTypes'
  | 'settings'
  | 'uiSettings'
  | 'registerUiSettings'
  | 'globalUiSettings'
  | 'featureFlags'
  | 'analyticsEventTypes'
  | 'registerAnalyticsEventTypes'
>;

/** The part of {@link TaskTypeModule} a hosted task type (one of the three workflow task types, or
 * another task type that reuses the engine's process services, such as an agent builder run) names
 * for itself; everything else comes from the contributions. */
type HostedTaskTypeDefinition = Pick<
  TaskTypeModule,
  | 'type'
  | 'title'
  | 'description'
  | 'timeout'
  | 'maxAttempts'
  | 'paramsSchema'
  | 'allowPriorityOverride'
>;

/**
 * The fields of a hosted task type module derived purely from its contributions: what a workflow run
 * (or another task type built on the same contributions, such as an agent builder run) needs besides
 * the runner itself. Shared by {@link defineWorkflowTaskType} and {@link defineWorkflowHostedTaskType}
 * so the two cannot drift on what a process is given.
 */
const buildContributedModuleFields = (
  definition: HostedTaskTypeDefinition,
  declared: Array<NonNullable<WorkflowStepsContribution['declares']>>,
  contributions: NonNullable<TaskHost['contributions']>
): Omit<TaskTypeModule, 'createTaskRunner' | 'contributions'> => ({
  ...definition,
  cancelGracePeriodMs: 5000,
  // Reads and schedules the `workflow:*` tasks (and the `actions:*` tasks that run connectors).
  taskManager: {
    schedulableTypes: [
      /^workflow:/,
      /^actions:/,
      ...declared.flatMap(({ schedulableTypes }) => schedulableTypes ?? []),
    ],
  },
  licensing: true,
  // Cases and the other steps count usage with the counters of their domain.
  usageCounters: true,
  // A run reports analytics events (its own, the connectors' and the steps'): Core requires the
  // event types to be registered in the process, as the plugins do in Kibana.
  analyticsEventTypes: [
    ...Object.entries(workflowExecutionEventSchemas).map(([eventType, schema]) => ({
      eventType,
      schema: schema as never,
    })),
    ...actionsEventTypes,
    ...declared.flatMap(({ analyticsEventTypes }) => analyticsEventTypes ?? []),
  ],
  createSavedObjectTypes: (encryption, settings) =>
    declared.flatMap(
      (declaration) =>
        declaration.createSavedObjectTypes?.(encryption, settings, {
          getContributions: <T extends object>(key: string) => (contributions[key] ?? []) as T[],
        }) ?? []
    ),
  registerUiSettings: declared.some((declaration) => declaration.registerUiSettings)
    ? (registry, settings) => {
        const seen = new Set(
          declared.flatMap(({ uiSettings }) => uiSettings?.flatMap(Object.keys) ?? [])
        );
        const globalSeen = new Set(
          declared.flatMap(({ globalUiSettings }) => globalUiSettings?.flatMap(Object.keys) ?? [])
        );
        const register = (defaults: Record<string, UiSettingsParams>, global: boolean): void => {
          const keys = global ? globalSeen : seen;
          const unique = Object.fromEntries(
            Object.entries(defaults).filter(([key]) => !keys.has(key) && keys.add(key))
          );
          if (Object.keys(unique).length > 0) {
            if (global) registry.registerGlobal(unique);
            else registry.register(unique);
          }
        };
        const deduplicated = {
          register: (defaults: Record<string, UiSettingsParams>) => register(defaults, false),
          registerGlobal: (defaults: Record<string, UiSettingsParams>) => register(defaults, true),
        };
        for (const declaration of declared)
          declaration.registerUiSettings?.(deduplicated, settings);
      }
    : undefined,
  registerAnalyticsEventTypes: (analytics) => {
    for (const declaration of declared) declaration.registerAnalyticsEventTypes?.(analytics);
  },
  featureFlags: Object.assign(
    { [WORKFLOWS_CORE_SELF_CLIENT_ENABLED_FLAG]: false },
    ...declared.map(({ featureFlags }) => featureFlags ?? {})
  ),
  eventLog: {
    providers: [
      { provider: ACTIONS_EVENT_LOG_PROVIDER, actions: Object.values(ACTIONS_EVENT_LOG_ACTIONS) },
      ...declared.flatMap(({ eventLogProviders }) => eventLogProviders ?? []),
    ],
    create: createStandaloneEventLog,
  },
  // The config of the engine and its cloud fields, the security and actions configs the services
  // it uses are built from, and what decides which API key a scheduled task is granted.
  settings: [
    WORKFLOWS_ENGINE_SETTINGS_ID,
    WORKFLOWS_ENGINE_CLOUD_SETTINGS_ID,
    'security',
    'actions',
    'taskManager',
  ],
  // What contributions read: a plugin that is disabled sends nothing, and its contribution then
  // registers nothing, so these are not required.
  optionalSettings: [...new Set(declared.flatMap(({ settings }) => settings ?? []))],
  ...(declared.some(({ dataStreams }) => dataStreams?.length)
    ? { dataStreams: declared.flatMap(({ dataStreams }) => dataStreams ?? []) }
    : {}),
  createDataStreams: (settings) => {
    const config = settings[WORKFLOWS_ENGINE_SETTINGS_ID] as
      | WorkflowsExecutionEngineConfig
      | undefined;
    if (!config) throw new Error('Native workflow data streams require engine settings');
    return Object.values(getWorkflowDataStreamDefinitions(config.storage));
  },
  // Only when contributions declare some: it gives the runner `host.uiSettings`.
  ...(declared.some(
    ({ uiSettings, globalUiSettings, registerUiSettings }) =>
      uiSettings?.length || globalUiSettings?.length || registerUiSettings
  )
    ? {
        uiSettings: {
          defaults: dedupeUiSettings(declared.flatMap(({ uiSettings }) => uiSettings ?? [])),
          globalDefaults: dedupeUiSettings(
            declared.flatMap(({ globalUiSettings }) => globalUiSettings ?? [])
          ),
        },
      }
    : {}),
  taskPlugins: [
    createSecurityTaskPlugin(kibanaPackageJson.version),
    // The analytics shipper, opted in as Kibana is: the process ships its events before it answers.
    createTelemetryTaskPlugin(kibanaPackageJson.version),
    createWorkflowsEngineTaskPlugin(kibanaPackageJson.version),
  ],
});

/** The keys read by a hosted task type's own `contributions`, and what they resolve to recursively. */
const resolveContributedKeys = (
  contributed: Record<string, unknown[]>
): {
  steps: WorkflowStepsContribution[];
  additional: Array<{ declares?: AgentBuilderContributionDeclares }>;
} => {
  const steps = (contributed[WORKFLOW_STEPS_CONTRIBUTIONS_KEY] ??
    []) as WorkflowStepsContribution[];
  const keys = new Set([
    AGENT_BUILDER_CONTRIBUTIONS_KEY,
    CASES_ATTACHMENT_TYPES_CONTRIBUTIONS_KEY,
    CASES_CLIENT_CONTRIBUTIONS_KEY,
    ...steps.flatMap(({ declares }) => declares?.contributionKeys ?? []),
  ]);
  const additional: Array<{ declares?: AgentBuilderContributionDeclares }> = [];
  for (const key of keys) {
    const entries = (contributed[key] ?? []) as typeof additional;
    additional.push(...entries);
    for (const { declares } of entries) {
      for (const nested of declares?.contributionKeys ?? []) keys.add(nested);
    }
  }
  return { steps, additional };
};

/**
 * The contribution keys every hosted task type reads: `alerting-rule-run` (the connector types of
 * the plugins that own them), `workflow-steps` (the steps and triggers of the plugins that register
 * them) and `agent-builder` (the tools, agents, skills and attachment types of the plugins that
 * register them with agent builder), plus whatever the resolved contributions themselves declare.
 */
const contributedKeys = (
  declared: Array<NonNullable<WorkflowStepsContribution['declares']>>
): string[] => [
  TASK_SCHEDULING_CONTRIBUTIONS_KEY,
  RULE_RUN_CONTRIBUTIONS_KEY,
  WORKFLOW_STEPS_CONTRIBUTIONS_KEY,
  AGENT_BUILDER_CONTRIBUTIONS_KEY,
  CASES_ATTACHMENT_TYPES_CONTRIBUTIONS_KEY,
  CASES_CLIENT_CONTRIBUTIONS_KEY,
  ...new Set(declared.flatMap(({ contributionKeys }) => contributionKeys ?? [])),
];

/** Attaches the lazily-built saved object declarations every hosted task type shares. */
const withSavedObjectDeclarations = (
  taskType: TaskTypeModule,
  declared: Array<NonNullable<WorkflowStepsContribution['declares']>>
): TaskTypeModule => {
  // The saved object types and encrypted registrations are built from the code of the actions plugin,
  // which costs something, so only when a task process reads them.
  let declarations: ReturnType<typeof getRuleRunDeclarations> | undefined;
  const getDeclarations = () => (declarations ??= getRuleRunDeclarations());
  return Object.defineProperties(taskType, {
    savedObjectTypes: {
      enumerable: true,
      get: () =>
        getDeclarations()
          .savedObjectTypes.filter((type) => ACTION_SAVED_OBJECT_TYPES.has(type.name))
          .concat(declared.flatMap(({ savedObjectTypes }) => savedObjectTypes ?? [])),
    },
    encryptedSavedObjectTypes: {
      enumerable: true,
      get: () => [
        ...getDeclarations().encryptedSavedObjectTypes.filter((registration) =>
          ACTION_SAVED_OBJECT_TYPES.has(registration.type)
        ),
        ...TASK_ENCRYPTED_SAVED_OBJECT_TYPE_REGISTRATIONS,
        ...declared.flatMap(({ encryptedSavedObjectTypes }) => encryptedSavedObjectTypes ?? []),
      ],
    },
  });
};

/**
 * One of the three workflow task types as a module. What it declares is what a process needs and
 * Kibana already has: the same module is registered in Kibana (whose plugin hands over its runtime)
 * and bundled for the task process (which builds a runtime from its host).
 */
export const defineWorkflowTaskType = (
  definition: HostedTaskTypeDefinition,
  pick: (runtime: WorkflowRuntime) => WorkflowTaskFunction,
  stepContributions: WorkflowStepsContribution[] = [],
  additionalContributions: Array<{ declares?: AgentBuilderContributionDeclares }> = [],
  contributions: NonNullable<TaskHost['contributions']> = {}
): TaskTypeModule => {
  const declared: Array<NonNullable<WorkflowStepsContribution['declares']>> = [
    ...stepContributions.map((contribution) => contribution.declares ?? {}),
    ...additionalContributions.map((contribution) => contribution.declares ?? {}),
  ];
  const taskType = defineTaskType({
    ...buildContributedModuleFields(definition, declared, contributions),
    contributions: {
      keys: contributedKeys(declared),
      // A task process hands over what plugins contribute; the module is built again with it.
      apply: (contributed) => {
        const { steps, additional } = resolveContributedKeys(contributed);
        return defineWorkflowTaskType(definition, pick, steps, additional, contributed);
      },
    },
    createTaskRunner: (context, host) => {
      let services: ReturnType<typeof getRuntime> | undefined;
      const pluginRuntime = getPluginRuntime(host);
      const pluginRunner = pluginRuntime ? pick(pluginRuntime)(context) : undefined;
      let processRunner: Promise<ReturnType<WorkflowTaskFunction>> | undefined;
      const getProcessRunner = () =>
        (processRunner ??= (async () => {
          services = getRuntime(host);
          const { runtime } = await services;
          context.signal.throwIfAborted();
          return pick(runtime)(context);
        })());
      return {
        run: async () => {
          context.signal.throwIfAborted();
          return (pluginRunner ?? (await getProcessRunner())).run();
        },
        cancel: async () => {
          if (pluginRunner) return pluginRunner.cancel?.();
          return processRunner?.then(
            (runner) => runner.cancel?.(),
            () => undefined
          );
        },
        cleanup: async () => {
          try {
            const runner = pluginRunner ?? (await processRunner?.catch(() => undefined));
            await runner?.cleanup?.();
          } finally {
            await services?.then(({ stop }) => stop?.());
          }
        },
      };
    },
  });
  return withSavedObjectDeclarations(taskType, declared);
};

/**
 * A task type that is not one of the three workflow task types, but reuses the same engine
 * contributions and process services (an agent builder run, say): the declared contributions,
 * saved objects, settings and task plugins are identical, but the runner is the caller's own,
 * given a lazy, memoized `getProcessRuntime` instead of the three workflow task functions
 * {@link defineWorkflowTaskType} picks from `WorkflowRuntime`.
 *
 * Unlike {@link defineWorkflowTaskType}, this does not look at `host.plugins.workflowsExecutionEngine`
 * for a Kibana-side shortcut: the caller's runner decides for itself, from its own plugin's host
 * extensions, whether it is running in Kibana or a process, and only calls `getProcessRuntime` when
 * it needs the process's registries (built, as a side effect, by running every `workflow-steps` and
 * `agent-builder` contribution against this engine's process runtime).
 */
export const defineWorkflowHostedTaskType = (
  definition: HostedTaskTypeDefinition,
  createHostedTaskRunner: (
    context: RunContext,
    host: TaskHost,
    getProcessRuntime: () => Promise<ProcessWorkflowRuntime>
  ) => CancellableTask,
  stepContributions: WorkflowStepsContribution[] = [],
  additionalContributions: Array<{ declares?: AgentBuilderContributionDeclares }> = [],
  contributions: NonNullable<TaskHost['contributions']> = {}
): TaskTypeModule => {
  const declared: Array<NonNullable<WorkflowStepsContribution['declares']>> = [
    ...stepContributions.map((contribution) => contribution.declares ?? {}),
    ...additionalContributions.map((contribution) => contribution.declares ?? {}),
  ];
  const taskType = defineTaskType({
    ...buildContributedModuleFields(definition, declared, contributions),
    contributions: {
      keys: contributedKeys(declared),
      apply: (contributed) => {
        const { steps, additional } = resolveContributedKeys(contributed);
        return defineWorkflowHostedTaskType(
          definition,
          createHostedTaskRunner,
          steps,
          additional,
          contributed
        );
      },
    },
    createTaskRunner: (context, host) => {
      let processRuntime: Promise<ProcessWorkflowRuntime> | undefined;
      const getProcessRuntime = () => (processRuntime ??= createWorkflowRuntimeFromHostLazy(host));
      return createHostedTaskRunner(context, host, getProcessRuntime);
    },
  });
  return withSavedObjectDeclarations(taskType, declared);
};
