/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { Config } from '@jest/types';
import { isEmpty, omitBy } from 'lodash';
import objectHash from 'object-hash';

export function createConfigHash(obj: Config.InitialOptions): string {
  // Create a stable key excluding fields we are allowed to merge or normalize
  const {
    roots,
    rootDir,
    bail,
    maxWorkers,
    maxConcurrency,
    workerThreads,
    workerIdleMemoryLimit,
    testTimeout,
    passWithNoTests,
    onlyFailures,
    onlyChanged,
    reporters,
    ...rest
  } = obj;

  return objectHash(omitBy(rest, isEmpty));
}
