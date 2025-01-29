/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Logger, IKibanaResponse, KibanaResponseFactory } from '@kbn/core/server';
import { createSession, Session } from '../lib/session';
import { createDeferred } from '../lib/deferred';

type StopProfilingFn = () => Promise<any>;
type StartProfilingFn<ArgType> = (session: Session, args: ArgType) => Promise<StopProfilingFn>;

export async function handleRoute<ArgType>(
  startProfiling: StartProfilingFn<ArgType>,
  args: ArgType,
  logger: Logger,
  response: KibanaResponseFactory,
  duration: number,
  type: string
): Promise<IKibanaResponse> {
  let session: Session;

  try {
    session = await createSession(logger);
  } catch (err) {
    const message = `unable to create session: ${err.message}`;
    logger.error(message);
    return response.badRequest({ body: message });
  }

  const deferred = createDeferred();
  let stopProfiling: any;
  try {
    stopProfiling = await startProfiling(session, args);
  } catch (err) {
    const message = `unable to start ${type} profiling: ${err.message}`;
    logger.error(message);
    return response.badRequest({ body: message });
  }

  setTimeout(whenDone, 1000 * duration);

  let profile;
  async function whenDone() {
    try {
      profile = await stopProfiling();
    } catch (err) {
      logger.warn(`unable to capture ${type} profile: ${err.message}`);
    }
    deferred.resolve();
  }

  await deferred.promise;

  try {
    await session.destroy();
  } catch (err) {
    logger.warn(`unable to destroy session: ${err.message}`);
  }

  if (profile == null) {
    const message = `unable to capture ${type} profile`;
    logger.error(message);
    return response.badRequest({ body: message });
  }

  const fileName = new Date()
    .toISOString()
    .replace('T', '_')
    .replace(/\//g, '-')
    .replace(/:/g, '-')
    .substring(5, 19);

  return response.ok({
    body: profile,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${fileName}.${type}profile"`,
    },
  });
}
