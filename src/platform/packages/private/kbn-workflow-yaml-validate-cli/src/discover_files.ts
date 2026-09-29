/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import Path from 'path';

const YAML_EXT = /\.ya?ml$/i;

export interface DiscoverOptions {
  /** Descend into subdirectories. When false, only the top-level dir is scanned. */
  recursive?: boolean;
}

/**
 * Resolve the set of workflow YAML files to validate.
 *
 * The target may be a single `.yml`/`.yaml` file (returned as-is) or a
 * directory. Directories are scanned for `*.yml`/`*.yaml`, skipping dotfiles and
 * dot-directories; `recursive` controls whether subdirectories are descended.
 * The result is sorted for deterministic output.
 */
export const discoverFiles = (
  target: string,
  { recursive = false }: DiscoverOptions = {}
): string[] => {
  const absolute = Path.resolve(target);

  let stat: fs.Stats;
  try {
    stat = fs.statSync(absolute);
  } catch (error) {
    throw new Error(`Path does not exist: ${absolute}`);
  }

  if (stat.isFile()) {
    if (!YAML_EXT.test(absolute)) {
      throw new Error(`Not a YAML file (expected .yml/.yaml): ${absolute}`);
    }
    return [absolute];
  }

  if (!stat.isDirectory()) {
    throw new Error(`Path is neither a file nor a directory: ${absolute}`);
  }

  const found: string[] = [];
  walk(absolute, recursive, found);
  return found.sort();
};

const walk = (dir: string, recursive: boolean, out: string[]): void => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    // Skip dotfiles and dot-directories (e.g. `.git`, `.DS_Store`).
    if (entry.name.startsWith('.')) {
      continue;
    }
    const absolute = Path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (recursive) {
        walk(absolute, recursive, out);
      }
      continue;
    }
    if (entry.isFile() && YAML_EXT.test(entry.name)) {
      out.push(absolute);
    }
  }
};
