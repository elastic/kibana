/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs/promises';
import Path from 'path';
import { randomUUID } from 'crypto';
import Os from 'os';
import { startProfiling } from './start_profiling';

export interface WithProfilerOptions {
  outDir?: string;
  fileName?: string;
}

/**
 * Run an async callback while capturing a V8 CPU profile. Writes the file to disk and returns
 * the result of the async callback.
 */
export async function withProfiler<T>(
  cb: () => Promise<T>,
  options: WithProfilerOptions = {}
): Promise<T> {
  const stop = await startProfiling();

  return await cb().finally(async () => {
    const { profile } = await stop();

    const { outDir, fileName } = options;

    const finalFileName = fileName ?? `profile-${process.pid}-${randomUUID()}.cpuprofile`;
    const filePath = Path.isAbsolute(finalFileName)
      ? finalFileName
      : Path.join(outDir ?? Path.join(Os.tmpdir(), 'kbn-profiler-cli-profiles'), finalFileName);

    await Fs.writeFile(filePath, JSON.stringify(profile));
  });
}
