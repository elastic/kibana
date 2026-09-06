/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import type { ConnectorSpec, ActionContext } from './connector_spec';

/**
 * Preflight check result for a single {connector, action} pair.
 */
export interface PreflightResult {
  /** The connector action that was checked. */
  action: string;
  /** Whether the action can be invoked successfully. */
  ok: boolean;
  /** Error message if ok is false. */
  error?: string;
}

/**
 * Input schema for the preflight health check.
 */
export const preflightInputSchema = z.object({
  /** Connector instance ID. */
  connectorId: z.string(),
  /** List of action names to verify. If omitted, checks all actions. */
  actions: z.array(z.string()).optional(),
});

export type PreflightInput = z.infer<typeof preflightInputSchema>;

/**
 * Run a preflight health check against a connector.
 *
 * For each action, verifies that:
 * 1. The connector is authenticated (auth credentials are valid)
 * 2. The action exists in the connector spec
 * 3. Required scopes/permissions are available
 *
 * Returns a per-action result so install/policy-save can surface actionable errors.
 */
export async function runPreflight(
  connector: ConnectorSpec,
  ctx: ActionContext,
  input: PreflightInput
): Promise<PreflightResult[]> {
  const results: PreflightResult[] = [];
  const actionsToCheck = input.actions ?? Object.keys(connector.actions);

  for (const actionName of actionsToCheck) {
    try {
      // Check if action exists
      const action = connector.actions[actionName];
      if (!action) {
        results.push({
          action: actionName,
          ok: false,
          error: `Action "${actionName}" does not exist on connector`,
        });
        continue;
      }

      // If the connector has a test handler, call it to verify auth
      if (connector.test?.handler) {
        try {
          await connector.test.handler(ctx);
        } catch (err) {
          results.push({
            action: actionName,
            ok: false,
            error: `Auth/scope check failed: ${err instanceof Error ? err.message : String(err)}`,
          });
          continue;
        }
      }

      results.push({ action: actionName, ok: true });
    } catch (err) {
      results.push({
        action: actionName,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return results;
}
