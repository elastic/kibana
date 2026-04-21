/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { cpus } from 'os';

import Piscina from 'piscina';
import type { TransformConfig } from '@kbn/babel-transform';

import type { Batch } from './plan';

export interface CopyPoolResult {
  peggyConfigOutputPaths: string[];
}

export interface CopyPool {
  run(batch: Batch): Promise<CopyPoolResult>;
  destroy(): Promise<void>;
}

export function createPool(transformConfig: TransformConfig): CopyPool {
  const pool = new Piscina({
    filename: require.resolve('./worker.mjs'),
    workerData: { transformConfig },
    minThreads: cpus().length,
    idleTimeout: 30_000,
  });

  return {
    run: (batch) => pool.run(batch) as Promise<CopyPoolResult>,
    destroy: () => pool.destroy(),
  };
}
