/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import type { BenchmarkRunnable } from './types';

const runnableSchema = z.object({
  run: z.function(),
  beforeAll: z.function().optional(),
  afterAll: z.function().optional(),
  before: z.function().optional(),
  after: z.function().optional(),
});

export function assertRunnable(runnable: unknown): asserts runnable is BenchmarkRunnable {
  runnableSchema.parse(runnable);
}
