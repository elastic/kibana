/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Session } from './session';

interface StartProfilingArgs {
  samplingInterval: number;
  includeObjectsCollectedByMajorGC: boolean;
  includeObjectsCollectedByMinorGC: boolean;
}

// Start a new profile, resolves to a function to stop the profile and resolve
// the profile data.
export async function startProfiling(
  session: Session,
  args: StartProfilingArgs
): Promise<() => any> {
  session.logger.info(`starting heap profile with args: ${JSON.stringify(args)}`);

  await session.post('Profiler.enable');
  await session.post('HeapProfiler.enable');
  await session.post('HeapProfiler.startSampling', args);

  // returned function which stops the profile and resolves to the profile data
  return async function stopProfiling() {
    session.logger.info('stopping heap profile');
    const result: any = await session.post('HeapProfiler.stopSampling');
    return result.profile;
  };
}
