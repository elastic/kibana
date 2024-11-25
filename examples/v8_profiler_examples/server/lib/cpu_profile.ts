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
  interval: number;
}

// Start a new profile, resolves to a function to stop the profile and resolve
// the profile data.
export async function startProfiling(
  session: Session,
  args: StartProfilingArgs
): Promise<() => any> {
  session.logger.info(`starting cpu profile with args: ${JSON.stringify(args)}`);

  await session.post('Profiler.enable');
  // microseconds, v8 default is 1000
  await session.post('Profiler.setSamplingInterval', args);
  await session.post('Profiler.start');

  // returned function which stops the profile and resolves to the profile data
  return async function stopProfiling() {
    session.logger.info('stopping cpu profile');
    const result: any = await session.post('Profiler.stop');
    return result.profile;
  };
}
