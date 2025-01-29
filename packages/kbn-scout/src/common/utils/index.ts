/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog } from '@kbn/tooling-log';
import * as Rx from 'rxjs';

export async function silence(log: ToolingLog, milliseconds: number) {
  await Rx.firstValueFrom(
    log.getWritten$().pipe(
      Rx.startWith(null),
      Rx.switchMap(() => Rx.timer(milliseconds))
    )
  );
}

export const measurePerformance = async <T>(
  log: ToolingLog,
  label: string,
  fn: () => T | Promise<T>
): Promise<T> => {
  const startTime = performance.now();
  const result = await Promise.resolve(fn());

  const duration = performance.now() - startTime;
  log.debug(`${label} took ${duration.toFixed(2)}ms`);

  return result;
};
