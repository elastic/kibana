/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs/promises';
import pRetry from 'p-retry';
import type { ToolingLog } from '@kbn/tooling-log';
import { DEFAULT_SAMPLING_INTERVAL_US } from '../default_sampling_interval';
import type { CpuProfile } from './types';

const DEFAULT_POLL_INTERVAL = 500;
const DEFAULT_TOTAL_TIMEOUT = 60_000;
const DEFAULT_INACTIVITY_TIMEOUT = 10_000;

interface ReadOptions {
  pollIntervalMs?: number; // default 500
  totalTimeoutMs?: number; // default 60000
  inactivityTimeoutMs?: number; // default 10000
}

export async function readProfile(
  path: string,
  log: ToolingLog,
  opts: ReadOptions = {}
): Promise<CpuProfile> {
  const pollInterval = opts.pollIntervalMs ?? DEFAULT_POLL_INTERVAL;
  const totalTimeout = opts.totalTimeoutMs ?? DEFAULT_TOTAL_TIMEOUT;
  const inactivityTimeout = opts.inactivityTimeoutMs ?? DEFAULT_INACTIVITY_TIMEOUT;

  const start = Date.now();

  let lastChange = start;
  let lastSize = -1;
  let lastMtimeMs = -1;

  async function readFile() {
    return await Fs.readFile(path, 'utf8').then((str) => JSON.parse(str) as CpuProfile);
  }

  async function pollForChanges(now: number) {
    const st = await Fs.stat(path);
    const mtimeMs = st.mtimeMs;
    const size = st.size;
    if (size !== lastSize || mtimeMs !== lastMtimeMs) {
      log.verbose(`Profile file ${path} changing (size=${size}, mtime=${mtimeMs})`);
      lastChange = now;
      lastSize = size;
      lastMtimeMs = mtimeMs;
    } else if (now - lastChange > inactivityTimeout) {
      // File hasn't changed in inactivity timeout window; abort retrying
      throw new pRetry.AbortError('Inactivity timeout exceeded');
    }
  }

  return await pRetry(
    async () => {
      const now = Date.now();

      if (now - start > totalTimeout) {
        throw new pRetry.AbortError('Total timeout exceeded');
      }

      return await readFile().catch(async (fileReadError) => {
        if (fileReadError instanceof RangeError) {
          // Abort immediately: profile too large to parse in memory
          throw new pRetry.AbortError(
            new Error(
              `CPU profile appears too large to parse (RangeError: ${fileReadError.message}). ` +
                `Increase the sampling interval to reduce sample count, e.g. set KBN_PROFILER_SAMPLING_INTERVAL to a higher microsecond value (current default ${DEFAULT_SAMPLING_INTERVAL_US}).`
            )
          );
        }

        await pollForChanges(now);

        throw fileReadError;
      });
    },
    {
      forever: true,
      factor: 1,
      minTimeout: pollInterval,
      maxTimeout: pollInterval,
      randomize: false,
    }
  );
}
