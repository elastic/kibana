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
import {
  type CommonServerStepDefinition,
  isOneShotStepDefinition,
  isPollOnlyStepDefinition,
  isStartPlusPollStepDefinition,
} from '../step_registry/types';

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
 * Builds a stable SHA-256 fingerprint of a step's author-written callables for
 * the Scout approval fixture (`approved_step_definitions.ts`).
 *
 * Hashing is mode-specific (mutually exclusive shapes):
 *
 * - **Single-shot** (`createServerStepDefinition` with `handler` only): SHA-256 of
 *   `handler.toString()`. Unchanged from the original approval flow so legacy steps
 *   keep their existing approved hashes.
 * - **Poll-only** (`createPollServerStepDefinition` without `start`): SHA-256 of
 *   `poll.toString()` only.
 * - **Start + poll** (`createPollServerStepDefinition` with `start` and `poll`):
 *   SHA-256 of `start` and `poll` source joined with `\n--\n` (order: start, then poll).
 *
 * `pollPolicy`, `pollCeilings`, and `onCancel` are not hashed — only the phase
 * functions that implement step behavior. Changing policy/ceilings or cancel cleanup
 * without editing `poll` / `start` / `handler` does not change the hash.
 */
function hashStepImplementation(definition: CommonServerStepDefinition): string {
  if (isStartPlusPollStepDefinition(definition)) {
    return createSHA256Hash(
      [definition.start.toString(), definition.poll.toString()].join('\n--\n')
    );
  }

  if (isPollOnlyStepDefinition(definition)) {
    return createSHA256Hash(definition.poll.toString());
  }

  if (isOneShotStepDefinition(definition)) {
    return createSHA256Hash(definition.handler.toString());
  }

  throw new Error(`Unknown step definition type: ${JSON.stringify(definition)}`);
}
