/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginStartContract as ActionsPluginStartContract } from '@kbn/actions-plugin/server';
import type { KibanaRequest } from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { z } from '@kbn/zod/v4';
import type { ServerStepDefinition } from './step_registry/types';
import type { CommonTriggerDefinition } from '../common';
import type { WorkflowsExtensionsStartContract } from '../common/types';

/** Server-side alias: same as CommonTriggerDefinition (used when registering on the server). */
export type ServerTriggerDefinition<EventSchema extends z.ZodType = z.ZodType> =
  CommonTriggerDefinition<EventSchema>;

/**
 * Parameters passed to the trigger event handler when an event is emitted.
 */
export interface TriggerEventHandlerParams {
  timestamp: string;
  triggerId: string;
  spaceId: string;
  payload: Record<string, unknown>;
  request: KibanaRequest;
}

/**
 * Handler invoked by the extensions plugin when emitEvent is called.
 * Registered during setup to resolve subscriptions and run workflows.
 */
export type TriggerEventHandler = (params: TriggerEventHandlerParams) => Promise<void>;

/**
 * Parameters for emitEvent.
 */
export interface EmitEventParams {
  triggerId: string;
  spaceId: string;
  payload: Record<string, unknown>;
  request: KibanaRequest;
}

/**
 * Emits a trigger event. Validates trigger id, then invokes the registered handler (which logs and runs subscribed workflows).
 * @throws Error if triggerId is not registered
 */
export type EmitEventFn = (params: EmitEventParams) => Promise<void>;

/**
 * Request-scoped client for emitting workflow trigger events.
 * Use from route handlers via ctx.workflows.getWorkflowsClient().
 */
export interface WorkflowsClient {
  /**
   * Emit an event for the given trigger. Subscribed workflows in the current request's space will run.
   * @param triggerId - Must match a trigger registered via registerTriggerDefinition
   * @param payload - Event payload; available in workflows as context.event
   * @throws Error if triggerId is not registered
   */
  emitEvent(triggerId: string, payload: Record<string, unknown>): Promise<void>;
}

/**
 * Workflows route handler context. Available as ctx.workflows for plugins that depend on workflows_extensions.
 */
export interface WorkflowsRouteHandlerContext {
  /**
   * Returns a request-scoped client bound to the current request and space.
   */
  getWorkflowsClient(): WorkflowsClient;
}

/**
 * Server-side plugin setup contract.
 * Exposes methods for other plugins to register server-side custom workflow steps and triggers.
 */
export interface WorkflowsExtensionsServerPluginSetup {
  /**
   * Register server-side definition for a workflow step.
   * This should be called during the plugin's setup phase.
   *
   * @param definition - The step server-side definition
   * @throws Error if definition for the same step type ID is already registered
   */
  registerStepDefinition(definition: ServerStepDefinition): void;

  /**
   * Register a workflow trigger definition.
   * This should be called during the plugin's setup phase.
   *
   * @param definition - The trigger definition
   * @throws Error if trigger id is already registered, validation fails, or registration is attempted after setup
   */
  registerTriggerDefinition(definition: ServerTriggerDefinition): void;

  /**
   * Register the handler invoked when emitEvent is called.
   * Should be called during the plugin's setup phase.
   *
   * @param handler - Function called with triggerId, spaceId, and payload when an event is emitted
   */
  registerTriggerEventHandler(handler: TriggerEventHandler): void;
}

/**
 * Server-side plugin start contract.
 * Exposes step definitions (from common contract), trigger definitions, and emitEvent.
 */
export type WorkflowsExtensionsServerPluginStart =
  WorkflowsExtensionsStartContract<ServerStepDefinition> & {
    /**
     * Get all registered trigger definitions.
     * @returns Array of all registered trigger definitions
     */
    getAllTriggerDefinitions(): ServerTriggerDefinition[];

    /**
     * Emit a trigger event.
     * @throws Error if triggerId is not registered
     */
    emitEvent: EmitEventFn;
  };

/**
 * Dependencies for the server plugin setup phase.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WorkflowsExtensionsServerPluginSetupDeps {}

/**
 * Dependencies for the server plugin start phase.
 */
export interface WorkflowsExtensionsServerPluginStartDeps {
  actions: ActionsPluginStartContract;
  inference: InferenceServerStart;
  spaces?: SpacesPluginStart;
}
