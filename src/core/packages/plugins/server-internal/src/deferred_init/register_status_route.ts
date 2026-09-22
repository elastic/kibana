/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core-http-server';
import { DEFERRED_INIT_STATUS_ROUTE } from '@kbn/core-deferred-init-common';
import type { DeferredInitStatusResponse } from '@kbn/core-deferred-init-common';
import type { DeferredInitEngine } from './deferred_init_engine';

/**
 * Register the always-available core endpoint the initializing UI polls:
 * `GET /internal/core/deferred_init/{pluginId}` -> {@link DeferredInitStatusResponse}.
 *
 * This is **not** Kibana's `/status` readiness/liveness probe. `/status` is wired to
 * `engine.state$` (read-only) and never triggers deferred init. This route is an internal UI
 * poll used by the app initializing gate; `authz: false` because it only exposes lifecycle
 * state (`idle` / `initializing` / `available` / `failed`), and it is internal-only.
 *
 * This is a core-owned route (never wrapped by {@link createGuardedRouter}), so it stays
 * reachable while a plugin is still initializing.
 *
 * Deliberately calls `ensureInitialized` rather than the read-only `getState`: opening a lazy
 * plugin's app is the first trigger, and the gate's poll is how that trigger arrives. Gated
 * routes provide the same nudge for API traffic. `ensureInitialized` only auto-kicks an `idle`
 * plugin (or a `failed` plugin after background retries are exhausted), never a `failed` plugin
 * still in cooldown, so a genuine failure is observable here instead of being silently
 * re-kicked away. Periodic k8s probes hitting `/status` cannot reach this handler.
 *
 * @internal
 */
export function registerDeferredInitStatusRoute(router: IRouter, engine: DeferredInitEngine): void {
  router.get(
    {
      path: DEFERRED_INIT_STATUS_ROUTE,
      validate: {
        params: schema.object({ pluginId: schema.string({ maxLength: 256 }) }),
      },
      security: {
        authz: {
          enabled: false,
          reason:
            'Exposes only non-sensitive deferred-init lifecycle state for the initializing UI to poll.',
        },
      },
      options: { access: 'internal' },
    },
    (context, request, response) => {
      const { pluginId } = request.params;
      const status = engine.ensureInitialized(pluginId);
      const failure = status === 'failed' ? engine.getFailureDetails(pluginId) : undefined;
      const body: DeferredInitStatusResponse = {
        pluginId,
        status,
        ...(failure && {
          error: { message: failure.message },
          attempts: failure.attempts,
          phase: failure.phase,
        }),
      };
      return response.ok({ body });
    }
  );
}
