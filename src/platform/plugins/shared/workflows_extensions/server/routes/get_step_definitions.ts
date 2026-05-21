/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IRouter } from '@kbn/core/server';
import { createSHA256Hash } from '@kbn/crypto';
import type { ServerStepRegistry } from '../step_registry';
import { isPollStepDefinition, type RegisteredStepDefinition } from '../step_registry/types';

const ROUTE_PATH = '/internal/workflows_extensions/step_definitions';

/**
 * Registers the route to get all registered step definitions.
 * This endpoint is used by Scout tests to validate that new step registrations
 * are approved by the workflows-eng team.
 */
export function registerGetStepDefinitionsRoute(
  router: IRouter,
  registry: ServerStepRegistry
): void {
  router.get(
    {
      path: ROUTE_PATH,
      options: {
        access: 'internal',
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route is used for testing purposes only. No sensitive data is exposed.',
        },
      },
      validate: false,
    },
    async (_context, _request, response) => {
      const allStepDefinitions = registry.getAll();
      const steps = allStepDefinitions
        .map((def) => ({ id: def.id, handlerHash: hashStepImplementation(def) }))
        .sort((a, b) => a.id.localeCompare(b.id));

      return response.ok({ body: { steps } });
    }
  );
}

/**
 * Builds a stable SHA-256 fingerprint of a step's implementation, covering
 * every callable that the step author writes:
 *
 * - The legacy `handler` (when present)
 * - The `start` phase (when present)
 * - The root-level `poll` function
 * - The `onCancel` cleanup
 *
 * Backward compatibility: steps that use only the legacy `handler` field
 * (no `onCancel`, `start`, or `poll`) produce the same hash as before, so the
 * existing approved fixture stays valid for unchanged legacy steps.
 *
 * Newer shapes (with `start`/`poll`/`onCancel`) join all present implementations
 * with a delimiter so adding poll support to an existing step changes the
 * hash and triggers re-approval.
 */
function hashStepImplementation(definition: RegisteredStepDefinition): string {
  const handler = 'handler' in definition ? definition.handler : undefined;
  const start = 'start' in definition ? definition.start : undefined;
  const poll = isPollStepDefinition(definition) ? definition.poll : undefined;
  const { onCancel } = definition;

  if (handler && !start && !poll && !onCancel) {
    return createSHA256Hash(handler.toString());
  }

  const parts = [
    handler?.toString() ?? '',
    start?.toString() ?? '',
    poll?.toString() ?? '',
    onCancel?.toString() ?? '',
  ];
  return createSHA256Hash(parts.join('\n--\n'));
}
