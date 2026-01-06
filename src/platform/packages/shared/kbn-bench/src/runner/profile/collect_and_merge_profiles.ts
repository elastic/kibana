/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import Path from 'path';
import Fs from 'fs/promises';
import type { ToolingLog } from '@kbn/tooling-log';
import { concatenateProfiles } from '@kbn/profiler';
import { partition } from 'lodash';

/**
 * Collects and merges multiple .cpuprofile files in the given directory so
 * they can be viewed as a single profile.
 *
 * After a benchmark run multiple profiles can exist because processes might
 * have been spawned.
 */
export async function collectAndMergeCpuProfiles({
  name,
  log,
  profilesDir,
}: {
  name: string;
  log: ToolingLog;
  profilesDir: string;
}): Promise<string | undefined> {
  const dirEntries = await Fs.readdir(profilesDir, { withFileTypes: true }).catch((err) => []);

  const unmergedProfileFiles = dirEntries
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.endsWith('.cpuprofile') &&
        !entry.name.endsWith('.merged.cpuprofile')
    )
    .map((entry) => Path.join(profilesDir, entry.name))
    .sort();

  if (unmergedProfileFiles.length === 0) {
    log.debug(`No CPU profiles found in ${profilesDir}`);
    return undefined;
  }

  // --cpu-prof creates files that start with CPU.
  const [spawnedProfiles, mainThreadProfiles] = partition(unmergedProfileFiles, (file) =>
    Path.basename(file).startsWith('CPU')
  );

  // because these two overlap, we pick one or the other.
  const profilesToMerge = spawnedProfiles.length ? spawnedProfiles : mainThreadProfiles;

  log.debug(`Merging ${profilesToMerge.length} CPU profiles from ${profilesDir}`);

  const mergedOutputPath = Path.join(profilesDir, `${name}.merged.cpuprofile`);

  await concatenateProfiles({
    log,
    name,
    out: mergedOutputPath,
    profilePaths: profilesToMerge,
  });

  log.debug(`Merged profile written to ${mergedOutputPath}`);

  return mergedOutputPath;
}
