/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEFAULT_SAMPLING_INTERVAL_US, withProfiler } from '@kbn/profiler';
import Fs from 'fs/promises';

/**
 * Starts and stops a profiler around an async callback,
 * and writes the profile to disk.
 */
export async function wrapInProfiler<T>(profilesDir: string, cb: () => Promise<T>): Promise<T> {
  const prev = process.env.NODE_OPTIONS || '';

  await Fs.mkdir(profilesDir, { recursive: true });

  const flags = [
    '--cpu-prof',
    `--cpu-prof-dir=${profilesDir}`,
    `--cpu-prof-interval=${DEFAULT_SAMPLING_INTERVAL_US}`,
  ];

  const appended = prev ? prev + ' ' + flags.join(' ') : flags.join(' ');
  process.env.NODE_OPTIONS = appended;

  return await withProfiler(cb, {
    outDir: profilesDir,
  }).finally(() => {
    process.env.NODE_OPTIONS = prev || undefined;
  });
}
