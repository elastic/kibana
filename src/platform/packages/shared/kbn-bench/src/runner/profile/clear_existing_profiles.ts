/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { Dirent } from 'fs';
import Fs from 'fs/promises';
import Path from 'path';

/**
 * Deletes existing profiles from disk for the given benchmark.
 */
export async function clearExistingProfiles(log: ToolingLog, profilesDir: string) {
  try {
    const entries: Dirent[] = await Fs.readdir(profilesDir, { withFileTypes: true }).catch(
      (err) => []
    );

    const toDelete = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.cpuprofile'))
      .map((entry) => Path.join(profilesDir, entry.name));

    if (toDelete.length) {
      log.debug(`Removing ${toDelete.length} existing cpu profile(s) for benchmark`);

      await Promise.all(toDelete.map((p) => Fs.unlink(p).catch(() => undefined)));
    }
  } catch (e) {
    log.warning(`Failed cleaning old cpu profiles: ${e.message}`);
  }
}
