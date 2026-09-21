/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';

import { KIBANA_JSONC_FILENAME, MOON_CONST } from './const';

export const MOON_GENERATOR_INPUT_FILES = new Set([
  MOON_CONST.MOON_CONFIG_FILE_NAME,
  MOON_CONST.EXTENSION_FILE_NAME,
  KIBANA_JSONC_FILENAME,
  'tsconfig.json',
  'package.json',
  ...MOON_CONST.JEST_CONFIG_FILES,
]);

export function isMoonGeneratorInput(relativePath: string): boolean {
  return MOON_GENERATOR_INPUT_FILES.has(Path.basename(relativePath));
}

export function getMoonAffectedProjectNames(
  relativePaths: string[],
  dependencyLookup: Record<string, string>
): string[] {
  const dirs: string[] = [];
  for (const relativePath of relativePaths) {
    if (!isMoonGeneratorInput(relativePath)) {
      continue;
    }
    const dir = Path.dirname(relativePath);
    if (dir && dir !== '.' && !dirs.includes(dir)) {
      dirs.push(dir);
    }
  }

  return dirs.flatMap((dir) => {
    const projectName = dependencyLookup[dir];
    return projectName ? [projectName] : [];
  });
}

export function buildMoonProjectDirLookup(
  packages: Array<{ name: string; normalizedRepoRelativeDir: string }>
): Record<string, string> {
  return Object.fromEntries(
    packages.map((pkg) => [pkg.normalizedRepoRelativeDir.replace(/\\/g, '/'), pkg.name])
  );
}
