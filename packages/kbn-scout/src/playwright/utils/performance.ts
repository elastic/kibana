/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ScoutLogger } from '../fixtures/worker';

export const measurePerformance = async <T>(
  log: ScoutLogger,
  label: string,
  fn: () => Promise<T>
): Promise<T> => {
  const startTime = performance.now();
  const result = await fn();
  const duration = performance.now() - startTime;
  log.debug(`${label} took ${duration.toFixed(2)}ms`);
  return result;
};
