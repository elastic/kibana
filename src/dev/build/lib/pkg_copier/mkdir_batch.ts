/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fsp from 'fs/promises';
import Path from 'path';
import { cpus } from 'os';

import { asyncForEachWithLimit } from '@kbn/std';

import type { Batch } from './plan';

export async function mkdirBatch(batch: Batch): Promise<void> {
  const dirs = new Set<string>();
  for (const record of batch.records) {
    dirs.add(Path.dirname(record.destAbs));
  }

  await asyncForEachWithLimit(dirs, cpus().length, async (dir) => {
    await Fsp.mkdir(dir, { recursive: true, mode: 0o755 });
  });
}
