/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Session } from 'inspector/promises';
import { DEFAULT_SAMPLING_INTERVAL_US } from './default_sampling_interval';

export interface ProfilingOptions {
  samplingIntervalUs?: number;
}

type StopProfiling = () => Promise<{ profile: unknown }>;

export async function startProfiling(options: ProfilingOptions = {}): Promise<StopProfiling> {
  const session = new Session();
  await session.connect();

  const samplingInterval = options.samplingIntervalUs ?? DEFAULT_SAMPLING_INTERVAL_US;

  await session.post('Profiler.enable');
  await session.post('Profiler.setSamplingInterval', {
    interval: samplingInterval,
  });

  await session.post('Profiler.start');

  const stop: StopProfiling = async () => {
    const { profile } = await session.post('Profiler.stop');
    await session.disconnect();
    return { profile };
  };

  return stop;
}
