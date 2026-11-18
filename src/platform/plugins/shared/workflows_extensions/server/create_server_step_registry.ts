/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  AnalyticsServiceSetup,
  EventTypeOpts,
  KibanaRequest,
  SavedObjectsType,
} from '@kbn/core/server';
import type { DataStreamsSetup } from '@kbn/core-data-streams-server';
import type { UiSettingsParams } from '@kbn/core-ui-settings-common';
import type { UiSettingsServiceSetup } from '@kbn/core-ui-settings-server';
import type {
  EncryptedSavedObjectsPluginSetup,
  EncryptedSavedObjectTypeRegistration,
} from '@kbn/encrypted-saved-objects-plugin/server';
import type { Logger } from '@kbn/logging';
import { ServerStepRegistry } from './step_registry/step_registry';
import { registerInternalStepDefinitions } from './steps';
import { TriggerRegistry } from './trigger_registry/trigger_registry';
import { registerInternalTriggerDefinitions } from './triggers';
import type {
  WorkflowsExtensionsServerPluginSetup,
  WorkflowsExtensionsServerPluginStart,
} from './types';

/** The part of the setup contract a plugin registers its steps and triggers through. */
export type WorkflowStepsRegistry = Pick<
  WorkflowsExtensionsServerPluginSetup,
  'registerStepDefinition' | 'registerTriggerDefinition'
>;

/** What the execution engine reads of the registry when it runs a workflow. */
export type WorkflowStepsRegistryView = Pick<
  WorkflowsExtensionsServerPluginStart,
  | 'isReady'
  | 'hasStepDefinition'
  | 'getStepDefinition'
  | 'getAllStepDefinitions'
  | 'getTriggerDefinition'
  | 'getAllTriggerDefinitions'
>;

/**
 * Builds the step and trigger registry without the plugin lifecycle, with the internal `data.*`
 * steps and the internal triggers registered: what a task process builds, and then hands to the
 * `workflow-steps` contributions of the plugins that register steps, as those plugins hand it to
 * `setup()` in Kibana. `isReady()` resolves once the loaders registered so far have settled.
 */
export const createServerStepRegistry = (
  logger: Logger
): WorkflowStepsRegistry & WorkflowStepsRegistryView => {
  const stepRegistry = new ServerStepRegistry(logger);
  const triggerRegistry = new TriggerRegistry();
  registerInternalStepDefinitions(stepRegistry);
  registerInternalTriggerDefinitions(triggerRegistry);
  return {
    registerStepDefinition: (definition) => stepRegistry.register(definition),
    registerTriggerDefinition: (definition) => triggerRegistry.register(definition),
    getStepDefinition: (id) => stepRegistry.get(id),
    hasStepDefinition: (id) => stepRegistry.has(id),
    getAllStepDefinitions: () => stepRegistry.getAll(),
    getTriggerDefinition: (id) => triggerRegistry.get(id),
    getAllTriggerDefinitions: () => triggerRegistry.list(),
    isReady: async () => {
      await stepRegistry.whenReady();
    },
  };
};

/**
 * What a plugin that registers workflow steps or triggers adds to the process of the workflows
 * engine task types (contribution key {@link WORKFLOW_STEPS_CONTRIBUTIONS}), as it adds them to
 * Kibana in its `setup()`. Exported as `contribution` from a file listed under
 * `taskTypeContributions` in the plugin's `kibana.jsonc`.
 */
export interface WorkflowStepsContribution {
  /**
   * What the steps and triggers read besides Core's: merged by the workflow task types into what a
   * task process registers (saved object types, encrypted types, ui settings defaults, the configs of
   * the plugins listed in `settings` and the feature flags with their fallbacks).
   */
  declares?: {
    /**
     * The step type ids this contribution's `register` adds to the step registry. Resolved to packs
     * in Main, which walks a workflow definition's step types to decide what a run needs
     * (`getPacks`).
     */
    stepTypes?: string[];
    /**
     * Ids this contribution's `provides` services need from another contribution's `provides`
     * (`getService` of a service this one does not itself provide). Added transitively when Main
     * resolves a definition's step types to packs, so a pack whose services depend on another's is
     * never selected alone.
     */
    requires?: string[];
    /** Native SDK registrations needed by this contribution, resolved transitively by the bundler. */
    contributionKeys?: string[];
    schedulableTypes?: RegExp[];
    savedObjectTypes?: SavedObjectsType[];
    /** Builds native saved objects with encryption setup and the dispatching plugin's configuration. */
    createSavedObjectTypes?: (
      encryption: Pick<EncryptedSavedObjectsPluginSetup, 'createMigration' | 'registerType'>,
      settings: WorkflowStepsContributionContext['settings'],
      registry: { getContributions: <T extends object>(key: string) => readonly T[] }
    ) => SavedObjectsType[];
    dataStreams?: Array<Parameters<DataStreamsSetup['registerDataStream']>[0]>;
    encryptedSavedObjectTypes?: EncryptedSavedObjectTypeRegistration[];
    settings?: string[];
    uiSettings?: Array<Record<string, UiSettingsParams>>;
    /** Registers the UI defaults enabled by the dispatching plugin's captured configuration. */
    registerUiSettings?: (
      uiSettings: Pick<UiSettingsServiceSetup, 'register' | 'registerGlobal'>,
      settings: WorkflowStepsContributionContext['settings']
    ) => void;
    /** Global ui settings the steps read, as `registerGlobal` takes them (read with `host.uiSettings.globalAsScopedToClient`). */
    globalUiSettings?: Array<Record<string, UiSettingsParams>>;
    featureFlags?: Record<string, boolean | string | number>;
    /** Event log providers (and their actions) the steps write events with. */
    eventLogProviders?: Array<{ provider: string; actions: string[] }>;
    /**
     * The analytics event types the steps report (`analytics.reportEvent`), which Core requires to be
     * registered in the process as the plugin registers them in Kibana.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    analyticsEventTypes?: Array<EventTypeOpts<any>>;
    /** Registers native event schemas without erasing their payload types. */
    registerAnalyticsEventTypes?: (
      analytics: Pick<AnalyticsServiceSetup, 'registerEventType'>
    ) => void;
  };
  /** Shared run services, created lazily so contributions may depend on each other. */
  provides?: Readonly<Record<string, (context: WorkflowStepsContributionContext) => object>>;
  register(
    registry: WorkflowStepsRegistry,
    context: WorkflowStepsContributionContext
  ): void | Promise<void>;
}

/**
 * What the engine's own runtime offers the steps of a task process, which a plugin's step reads in
 * Kibana from the start contracts of the actions and workflows plugins.
 */
export interface WorkflowStepsContributionServices {
  /** Waits for work queued by a step before task cleanup and effect flushing begin. */
  registerRunCompletion: (complete: () => Promise<void>) => void;
  stepRegistry: WorkflowStepsRegistryView;
  registerService: (id: string, service: object) => void;
  /** Resolves native owning-plugin contracts or explicit ports for constructing them for this run. */
  getService: <T extends object>(id: string) => T;
  /** Resolves after registration finishes and the engine runtime has been composed. */
  getExecutionEngine: <T extends object>() => Promise<T>;
  /** The internal actions client, with the same allowed callers as Kibana. */
  getUnsecuredActionsClient: () => object;
  /** The actions client of a request: the one of the connectors the process runs. */
  getActionsClientWithRequest: (request: KibanaRequest) => Promise<unknown>;
  /**
   * The clients of the execution and step execution storage, over the indices or data streams the
   * engine is configured with (the types are the engine's `WorkflowExecutionsDataClient` and
   * `StepExecutionsDataClient`).
   */
  executionDataClients: {
    createWorkflowDataClient: () => unknown;
    createStepDataClient: () => unknown;
  };
  /**
   * Schedules a workflow run (a `workflow:run` task) and returns its execution id: what the engine's
   * `scheduleWorkflow` does for the management API in Kibana (the types are the engine's
   * `WorkflowExecutionEngineModel` and `KibanaRequest`).
   */
  scheduleWorkflow?: (
    workflow: unknown,
    context: Record<string, unknown>,
    request: KibanaRequest
  ) => Promise<{ workflowExecutionId: string }>;
  /** Emits a trigger event: the workflows it matches are scheduled by this run's process. */
  emitEvent: (params: {
    triggerId: string;
    payload: Record<string, unknown>;
    request: KibanaRequest;
  }) => Promise<void>;
}

/**
 * A check a contribution registers on the steps of a workflow before a task process runs it: it
 * returns why the process cannot serve the step as Kibana would (the run then fails without
 * executing in Kibana), or `undefined`.
 */
export type WorkflowStepRunCheck = (step: {
  type: string;
  /** The step as written in the workflow definition. */
  config: Record<string, unknown>;
}) => string | undefined;

/** What a contribution may use: the process (its host), not the plugins around it. */
export interface WorkflowStepsContributionContext {
  /** The task host of the process; the services the plugin's steps are built from. */
  host: unknown;
  /** The services of the engine's runtime, which are not part of the host. Absent in unit tests of a contribution that does not use them. */
  services?: WorkflowStepsContributionServices;
  /** Whether a step type is registered in this process, once every contribution registered. */
  hasStepDefinition?: (stepTypeId: string) => boolean;
  /** Registers a check that can decline a workflow whose steps the process cannot serve like Kibana. */
  registerRunCheck?: (check: WorkflowStepRunCheck) => void;
  logger: Logger;
  isServerless: boolean;
  kibanaVersion: string;
  publicBaseUrl?: string;
  /** The validated configs Kibana sent, by plugin id. */
  settings: Record<string, unknown>;
}

/** The contribution key under which plugins add their workflow steps and triggers. */
export const WORKFLOW_STEPS_CONTRIBUTIONS = 'workflow-steps';
