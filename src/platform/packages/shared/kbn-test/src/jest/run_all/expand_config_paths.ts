/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execSync } from 'child_process';
import minimatch from 'minimatch';
import Path from 'path';
import { existsSync } from 'fs';

export function expandConfigPaths(inputs: string[]): string[] {
  const matches = new Set<string>();

  for (const input of inputs) {
    // If input is already an absolute path and exists, add it directly
    if (Path.isAbsolute(input) && existsSync(input)) {
      matches.add(input);
      continue;
    }

    // If it's a direct file path (no glob patterns), resolve and check existence
    if (!input.includes('*') && !input.includes('?') && !input.includes('[')) {
      const resolved = Path.resolve(input);
      if (existsSync(resolved)) {
        matches.add(resolved);
      }
      continue;
    }

    // For glob patterns, use git ls-files with pattern filtering to avoid ENOBUFS
    // Use multiple smaller commands instead of one huge output
    const patterns = input.split('/');
    const basePattern = patterns[0];

    try {
      // First, get a filtered list using git ls-files with pathspec
      const gitFiles = execSync(`git ls-files "${basePattern}*"`, {
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      })
        .trim()
        .split('\n')
        .filter(Boolean);

      // Then apply minimatch to the filtered results
      for (const gitFile of gitFiles) {
        if (minimatch(gitFile, input)) {
          matches.add(Path.resolve(gitFile));
        }
      }
    } catch (error) {
      // Fallback: if git command fails, try direct file resolution
      const resolved = Path.resolve(input);
      if (existsSync(resolved)) {
        matches.add(resolved);
      }
    }
  }

  return Array.from(matches);
}
