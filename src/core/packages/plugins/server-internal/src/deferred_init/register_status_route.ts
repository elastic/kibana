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
 * Registers the always-available core endpoint the initializing UI polls:
 * `GET /internal/core/deferred_init/{pluginId}` -> {@link DeferredInitStatusResponse}.
 *
 * This is **not** Kibana's `/status` readiness/liveness probe. `/status` mirrors the engine's
 * `status$` (read-only) and never starts an attempt. This route is an internal UI poll used by
 * the app initializing gate; `authz: false` because it only exposes lifecycle state
 * (`idle` / `initializing` / `available` / `failed`), the attempt count and the last error
 * message, and it is internal-only.
 *
 * This is a core-owned route (never wrapped by {@link createGuardedRouter}), so it stays
 * reachable while a plugin is still initializing.
 *
 * Deliberately calls `ensureInitialized` rather than only the read-only `getStatus`: opening the
 * app of a plugin with `initialize()` is the first trigger, and the gate's poll is how that
 * trigger arrives (gated routes provide the same nudge for API traffic). The status is read
 * *before* the kick, and that is what the body reports: once background retries are exhausted,
 * every poll kicks a new attempt, so reading after the kick would turn `failed` into
 * `initializing` and the browser could never observe the failure. `ensureInitialized` leaves a
 * `failed` plugin alone while a background retry is still scheduled, so a genuine failure stays
 * observable instead of being re-kicked away. Periodic k8s probes hitting `/status` cannot reach
 * this handler.
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
            'Exposes only non-sensitive plugin initialization status for the initializing UI to poll.',
        },
      },
      options: { access: 'internal' },
    },
    (context, request, response) => {
      const { pluginId } = request.params;
      // Read first, kick second: the body must report the state this poll found, not the
      // `initializing` the kick below may have just produced.
      const { state, attempts, lastError } = engine.getStatus(pluginId);
      engine.ensureInitialized(pluginId);
      const body: DeferredInitStatusResponse = {
        pluginId,
        status: state,
        ...(attempts > 0 && { attempts }),
        ...(lastError && { error: { message: lastError.message } }),
      };
      return response.ok({ body });
    }
  );
}
