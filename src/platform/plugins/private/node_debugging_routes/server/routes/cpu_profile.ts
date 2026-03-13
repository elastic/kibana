/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { Logger, IRouter } from '@kbn/core/server';

import { createSession } from '../lib/inspector';
import { AUTHZ_OPT_OUT_REASON } from './constants';

const DURATION_SCHEMA = schema.object({
  duration: schema.number({
    defaultValue: 5,
    min: 1,
    max: 300,
  }),
});

const ROUTE_PATH = '/internal/node_debugging_routes/cpu_profile';

/**
 * Captures a CPU profile using Chrome DevTools Protocol Profiler.start / Profiler.stop /
 * Profiler.disable via node:inspector. Creates and disconnects its own inspector Session.
 *
 * @param durationSeconds - How long to sample in seconds
 * @returns The profile object returned by CDP Profiler.stop
 * @throws Error if session creation, Profiler.enable/start/stop, or disconnect fails, or if profile is null
 */
export const captureCpuProfile = async (durationSeconds: number): Promise<unknown> => {
  const session = createSession();

  try {
    await session.post('Profiler.enable');
    await session.post('Profiler.start');
  } catch (err) {
    session.disconnect();
    throw new Error(
      `Profiler start failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  await new Promise((resolve) => setTimeout(resolve, durationSeconds * 1000));

  let result: { profile: unknown };
  try {
    result = (await session.post('Profiler.stop')) as { profile: unknown };
    await session.post('Profiler.disable');
  } finally {
    session.disconnect();
  }

  if (result.profile == null) {
    throw new Error('No profile captured');
  }

  return result.profile;
};

/**
 * CPU profile route using Chrome DevTools Protocol Profiler.start / Profiler.stop /
 * Profiler.disable via node:inspector.
 */
export const registerCpuProfileRoute = (logger: Logger, router: IRouter): void => {
  router.get(
    {
      path: ROUTE_PATH,
      options: { access: 'public' },
      security: {
        authz: {
          enabled: false,
          reason: AUTHZ_OPT_OUT_REASON,
        },
      },
      validate: { query: DURATION_SCHEMA },
    },
    async (context, request, response) => {
      const durationSeconds = request.query.duration;

      let profile: unknown;
      try {
        profile = await captureCpuProfile(durationSeconds);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(message);
        return response.badRequest({ body: { message } });
      }

      const filename = `cpu-profile-${Date.now()}.cpuprofile`;
      return response.ok({
        body: profile as Record<string, unknown>,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }
  );
};
