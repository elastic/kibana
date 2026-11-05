/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { IKibanaResponse, IRouter, KibanaResponseFactory, Logger } from '@kbn/core/server';
import {
  API_BASE_PATH,
  getProfileFileName,
  getProfileRoutePath,
  type ProfileType,
  type ProfilerStatusResponse,
} from '../../common';
import type { CompletedProfile, ProfileRunner, ProfileRunners } from '../lib/profile_runner';
import { ProfileStateError } from '../lib/profile_state_error';

const security = {
  authz: {
    enabled: false,
    reason:
      'This development-only route profiles the Kibana server process with the Node.js inspector and is not registered outside of dev mode.',
  },
} as const;

const durationQuerySchema = schema.object({
  duration: schema.number({ defaultValue: 5, min: 1, max: 300 }),
});

function profileResponse(
  response: KibanaResponseFactory,
  type: ProfileType,
  { profile, startedAt }: CompletedProfile
): IKibanaResponse {
  return response.ok({
    body: profile,
    headers: {
      'content-type': 'application/json',
      'content-disposition': `attachment; filename="${getProfileFileName(type, startedAt)}"`,
    },
  });
}

async function runProfilerAction(
  logger: Logger,
  response: KibanaResponseFactory,
  action: () => Promise<IKibanaResponse>
): Promise<IKibanaResponse> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof ProfileStateError) {
      return response.conflict({ body: { message: error.message } });
    }
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Profiler request failed: ${message}`);
    return response.customError({ statusCode: 500, body: { message } });
  }
}

/** Registers the status route reporting which profiles are running. */
export function registerStatusRoute(router: IRouter, runners: ProfileRunners): void {
  router.get(
    { path: `${API_BASE_PATH}/status`, security, validate: false },
    async (context, request, response) => {
      const body: ProfilerStatusResponse = {
        cpu: { isRunning: runners.cpu.isRunning() },
        memory: { isRunning: runners.memory.isRunning() },
      };
      return response.ok({ body });
    }
  );
}

/** Registers the duration, start and stop routes for one profile type. */
export function registerProfileRoutes(
  router: IRouter,
  logger: Logger,
  type: ProfileType,
  runner: ProfileRunner
): void {
  const path = getProfileRoutePath(type);

  // Public access lets the route be opened directly from the browser address bar.
  router.get(
    {
      path,
      security,
      options: { access: 'public' },
      validate: { query: durationQuerySchema },
    },
    async (context, request, response) =>
      runProfilerAction(logger, response, async () =>
        profileResponse(response, type, await runner.capture(request.query.duration))
      )
  );

  router.post(
    { path: `${path}/start`, security, validate: false },
    async (context, request, response) =>
      runProfilerAction(logger, response, async () => {
        await runner.start();
        return response.ok({ body: {} });
      })
  );

  router.post(
    { path: `${path}/stop`, security, validate: false },
    async (context, request, response) =>
      runProfilerAction(logger, response, async () =>
        profileResponse(response, type, await runner.stop())
      )
  );
}
