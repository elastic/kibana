/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { Logger } from 'kibana/server';

export async function logExecutionLatency<T>(
  logger: Logger,
  activity: string,
  func: () => Promise<T>
): Promise<T> {
  const start = new Date().getTime();
  return await func().then((res) => {
    logger.info(activity + ' took ' + (new Date().getTime() - start) + 'ms');
    return res;
  });
}
