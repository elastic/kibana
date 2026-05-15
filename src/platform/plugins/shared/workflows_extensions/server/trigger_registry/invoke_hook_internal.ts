/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import type { HookResult } from '@kbn/workflows/server/types';
import type { HookHandlerRegistry } from './hook_handler_registry';
import type { TriggerRegistry } from './trigger_registry';

interface InvokeHookDeps {
  triggerRegistry: TriggerRegistry;
  hookHandlerRegistry: HookHandlerRegistry;
  sessionCapabilityCache: Map<string, Record<string, unknown>>;
  logger: Logger;
}

export const invokeHookInternal = async (
  { triggerRegistry, hookHandlerRegistry, sessionCapabilityCache, logger }: InvokeHookDeps,
  triggerId: string,
  payload: Record<string, unknown>,
  capabilities?: Record<string, unknown>
): Promise<HookResult> => {
  const definition = triggerRegistry.get(triggerId);
  if (!definition) {
    throw new Error(
      `Trigger "${triggerId}" is not registered. Register it during plugin setup via registerTriggerDefinition.`
    );
  }
  if (!definition.sync) {
    throw new Error(
      `Trigger "${triggerId}" does not have a sync block. Only sync triggers can be invoked via invokeHook.`
    );
  }

  const handlers = hookHandlerRegistry.getHandlers(triggerId);
  if (handlers.length === 0) {
    return { status: 'pass_through', output: payload };
  }

  const sessionId = typeof payload.sessionId === 'string' ? payload.sessionId : undefined;
  if (sessionId && capabilities) {
    sessionCapabilityCache.set(sessionId, capabilities);
  }

  const { chained, failurePolicy, maxTimeout, outputSchema } = definition.sync;
  const timeoutMs = parseTimeoutMs(maxTimeout);
  let current = payload;

  try {
    for (const handler of handlers) {
      try {
        const rawResult = await Promise.race([
          handler(current, capabilities),
          new Promise<never>((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error(`Hook handler for trigger "${triggerId}" timed out after ${maxTimeout}`)
                ),
              timeoutMs
            )
          ),
        ]);

        const validation = outputSchema.safeParse(rawResult);
        if (!validation.success) {
          throw new Error(
            `Handler output for trigger "${triggerId}" failed schema validation: ${validation.error.message}`
          );
        }

        if (chained) {
          current = rawResult;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (failurePolicy === 'closed') {
          return { status: 'failed', output: current, error: message };
        }
        logger.warn(
          `Hook handler for trigger "${triggerId}" failed (failurePolicy: open): ${message}`
        );
      }
    }
  } finally {
    if (sessionId) {
      sessionCapabilityCache.delete(sessionId);
    }
  }

  return { status: 'completed', output: current };
};

/** Format is validated at registration time via TriggerRegistry. */
export const parseTimeoutMs = (timeout: string): number => {
  const match = timeout.match(/^(\d+)(ms|s|m)$/);
  if (!match)
    throw new Error(`Invalid maxTimeout format: "${timeout}". Expected e.g. '15s', '500ms', '2m'.`);
  const value = parseInt(match[1], 10);
  if (match[2] === 'ms') return value;
  if (match[2] === 's') return value * 1_000;
  return value * 60_000;
};
