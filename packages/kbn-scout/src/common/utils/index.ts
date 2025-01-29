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

/**
 * Measure the performance of a sync function
 */
export const measurePerformance = <T>(log: ToolingLog, label: string, fn: () => T): T => {
  const startTime = performance.now();
  const result = fn();

  const duration = performance.now() - startTime;
  log.debug(`${label} took ${duration.toFixed(2)}ms`);

  return result;
};

/**
 * Measure the performance of an async function
 */
export const measurePerformanceAsync = async <T>(
  log: ToolingLog,
  label: string,
  fn: () => Promise<T>
): Promise<T> => {
  const startTime = performance.now();
  const result = await fn();

  const duration = performance.now() - startTime;
  log.debug(`${label} took ${duration.toFixed(2)}ms`);

  return result;
};
