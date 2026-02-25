/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TriggerRegistry } from './trigger_registry/trigger_registry';
import type { EmitEventParams, TriggerEventHandler } from './types';

export interface EmitEventDeps {
  triggerRegistry: TriggerRegistry;
  triggerEventHandler: TriggerEventHandler | null;
}

/**
 * Emits an event for a trigger type. Call this when something happens that workflows may be subscribed to.
 * The trigger must be registered (e.g. via registerTriggerDefinition); subscribed workflows are resolved and run by the platform.
 *
 * @throws Error if triggerId is not registered
 */
export async function emitEvent(params: EmitEventParams, deps: EmitEventDeps): Promise<void> {
  const timestamp = new Date().toISOString();
  const { triggerId, spaceId, payload } = params;
  const { triggerRegistry, triggerEventHandler } = deps;

  if (!triggerRegistry.has(triggerId)) {
    throw new Error(
      `Trigger "${triggerId}" is not registered. Register it during plugin setup via registerTriggerDefinition.`
    );
  }

  if (triggerEventHandler) {
    await triggerEventHandler({ timestamp, triggerId, spaceId, payload });
  }
}
