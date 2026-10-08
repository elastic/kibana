/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'node:fs/promises';
import Path from 'node:path';

/** Staging directory inside the target one: renaming within a filesystem is atomic. */
export const STAGING_DIR = '.event-loop-watchdog-staging';

/**
 * Writes `data` to `dir/name` so that the file only ever appears complete: files in a diagnostics
 * directory may be collected as soon as they appear. The file is staged in a hidden directory
 * inside `dir` (a mount's parent may be another filesystem), which is removed afterwards.
 */
export const writeFileAtomically = async (
  dir: string,
  name: string,
  data: string | Uint8Array
): Promise<string> => {
  const stagingDir = Path.join(dir, STAGING_DIR);
  const staged = Path.join(stagingDir, name);
  const file = Path.join(dir, name);
  // The directory may have been collected (with anything left in it) since the last write.
  await Fs.mkdir(stagingDir, { recursive: true });
  try {
    await Fs.writeFile(staged, data);
    await Fs.rename(staged, file);
  } finally {
    await Fs.rm(stagingDir, { recursive: true, force: true });
  }
  return file;
};
