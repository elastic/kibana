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
import type { ServerStepDefinition } from '../step_registry/types';

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
 * - The new `run` phase
 * - The `poll.handler`
 * - The `onCancel` cleanup
 *
 * Backward compatibility: steps that use only the legacy `handler` field
 * (no `onCancel`, `run`, or `poll`) produce the same hash as before, so the
 * existing approved fixture stays valid for unchanged legacy steps.
 *
 * Newer shapes (with `run`/`poll`/`onCancel`) join all present implementations
 * with a delimiter so adding a poll lifecycle to an existing step changes the
 * hash and triggers re-approval.
 */
function hashStepImplementation(definition: ServerStepDefinition): string {
  const { handler, run, poll, onCancel } = definition;

  if (handler && !run && !poll && !onCancel) {
    return createSHA256Hash(handler.toString());
  }

  const parts = [
    handler?.toString() ?? '',
    run?.toString() ?? '',
    poll?.handler.toString() ?? '',
    onCancel?.toString() ?? '',
  ];
  return createSHA256Hash(parts.join('\n--\n'));
}
