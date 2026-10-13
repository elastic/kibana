/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';
import { getKibanaDir } from '../utils.ts';

const REPO_ROOT = getKibanaDir();

/**
 * Resolves `moon`'s absolute path — run via `node`, not yarn, so it's not on `PATH`.
 * `MOON_BIN` points at a standalone install (e.g. the bootstrap-less pick step).
 */
function getMoonBinPath(): string {
  if (process.env.MOON_BIN) {
    return process.env.MOON_BIN;
  }

  const moonBinPath = path.resolve(REPO_ROOT, 'node_modules/.bin/moon');
  if (existsSync(moonBinPath)) {
    return moonBinPath;
  }

  return execSync('pnpm --silent exec which moon', { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
}

const parseProjectIds = (output: string): Set<string> => {
  const { projects }: { projects?: Array<{ id?: string }> } = JSON.parse(output);
  return new Set(Array.isArray(projects) ? projects.flatMap(({ id }) => (id ? [id] : [])) : []);
};

/**
 * Returns the moon projects owning `files` plus all their transitive dependents. The files are
 * passed on stdin, so moon skips its own VCS diff; files outside any project are ignored.
 */
export function getDownstreamProjectsMoon(files: readonly string[]): Set<string> {
  // With no stdin files moon would fall back to diffing the working tree.
  if (files.length === 0) {
    return new Set();
  }

  const output = execSync(`"${getMoonBinPath()}" query projects --affected --downstream deep`, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    maxBuffer: 200 * 1024 * 1024, // every project's full config is serialized
    timeout: 120000, // a cold agent first downloads moon's toolchain plugins
    input: JSON.stringify({ files }),
  });

  return parseProjectIds(output);
}

export function getAffectedProjectsMoon(
  mergeBase: string,
  includeDownstream: boolean
): Set<string> {
  const execOptions = {
    cwd: REPO_ROOT,
    encoding: 'utf8' as const,
    maxBuffer: 30 * 1024 * 1024, // 30MB buffer
  };

  // Mirror the git strategy: recompute the actual merge base instead of trusting `mergeBase` as-is.
  const actualBase = execSync(`git merge-base ${mergeBase} HEAD`, execOptions).trim();

  const downstreamFlag = includeDownstream ? '--downstream deep' : '';
  const command = `"${getMoonBinPath()}" query projects --affected ${downstreamFlag}`;

  const output = execSync(command, {
    ...execOptions,
    timeout: 30000, // 30 seconds
    env: {
      ...process.env,
      MOON_BASE: actualBase,
      // An explicit head keeps generated files in the working tree out of the comparison.
      MOON_HEAD: 'HEAD',
    },
  });

  return parseProjectIds(output);
}
