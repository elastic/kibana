/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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

const ROUTE_PATH = '/internal/node_debugging_routes/memory_profile';

/**
 * Captures a memory (sampling) profile using the Chrome DevTools Protocol HeapProfiler domain
 * (v8/Node inspector: https://chromedevtools.github.io/devtools-protocol/v8/HeapProfiler/).
 * Sequence: enable → startSampling → wait → getSamplingProfile → stopSampling → disable.
 *
 * @param durationSeconds - How long to sample in seconds
 * @returns The profile (SamplingHeapProfile: head + samples)
 * @throws Error if session creation, HeapProfiler calls, or disconnect fails, or if profile is null
 */
export const captureMemoryProfile = async (durationSeconds: number): Promise<unknown> => {
  const session = createSession();

  try {
    await session.post('HeapProfiler.enable');
    await session.post('HeapProfiler.startSampling');
  } catch (err) {
    session.disconnect();
    throw new Error(
      `HeapProfiler startSampling failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  await new Promise((resolve) => setTimeout(resolve, durationSeconds * 1000));

  let getProfileResult: { profile: unknown };
  try {
    getProfileResult = (await session.post('HeapProfiler.getSamplingProfile')) as {
      profile: unknown;
    };
    await session.post('HeapProfiler.stopSampling');
    await session.post('HeapProfiler.disable');
  } finally {
    session.disconnect();
  }

  if (getProfileResult.profile == null) {
    throw new Error('No sampling profile captured');
  }

  return getProfileResult.profile;
};

/**
 * Memory (sampling) profile route using CDP HeapProfiler domain (enable / startSampling /
 * getSamplingProfile / stopSampling / disable) via node:inspector.
 */
export const registerMemoryProfileRoute = (logger: Logger, router: IRouter): void => {
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
        profile = await captureMemoryProfile(durationSeconds);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(message);
        return response.badRequest({ body: { message } });
      }

      const filename = `memory-profile-${Date.now()}.heapprofile`;
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
