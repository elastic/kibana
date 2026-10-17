/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFileSync, execSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';
import { getKibanaDir } from '../utils.ts';

/**
 * Resolves `moon`'s absolute path — run via `node`, not yarn, so it's not on `PATH`.
 * `MOON_BIN` points at a standalone install (e.g. the bootstrap-less pick step).
 */
function getMoonBinPath(): string {
  if (process.env.MOON_BIN) {
    return process.env.MOON_BIN;
  }

  const moonBinPath = path.resolve(getKibanaDir(), 'node_modules/.bin/moon');
  if (existsSync(moonBinPath)) {
    return moonBinPath;
  }

  return execSync('pnpm --silent exec which moon', {
    cwd: getKibanaDir(),
    encoding: 'utf8',
  }).trim();
}

/** Repo-relative paths changed between two commits, deleted files included, sorted. */
export function listChangedFilesMoon({ base, head }: { base: string; head: string }): string[] {
  const output = execFileSync(
    getMoonBinPath(),
    ['query', 'changed-files', '--base', base, '--head', head],
    {
      cwd: getKibanaDir(),
      encoding: 'utf8',
      maxBuffer: 30 * 1024 * 1024,
      timeout: 120000, // a cold agent first downloads moon's toolchain plugins
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );

  const { files }: { files?: unknown } = JSON.parse(output);
  if (!Array.isArray(files)) {
    throw new Error('moon query changed-files returned no file list');
  }
  return files.map(String).sort();
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
    cwd: getKibanaDir(),
    encoding: 'utf8',
    maxBuffer: 200 * 1024 * 1024, // every project's full config is serialized
    timeout: 120000, // a cold agent first downloads moon's toolchain plugins
    input: JSON.stringify({ files }),
  });

  return parseProjectIds(output);
}

/** Why moon considers a task affected: its own changed inputs and its affected deps. */
export interface MoonTaskAffectedReasons {
  files: string[];
  /** Targets (`<project>:<task>`) of affected deps. */
  upstream: string[];
}

/**
 * Returns why `project:task` is affected by `files`, following task deps downstream, or
 * undefined when it isn't. The files are passed on stdin, so moon skips its own VCS diff.
 */
export function getAffectedTaskReasonsMoon(
  project: string,
  task: string,
  files: readonly string[]
): MoonTaskAffectedReasons | undefined {
  // With no stdin files moon would fall back to diffing the working tree.
  if (files.length === 0) {
    return undefined;
  }

  const output = execFileSync(
    getMoonBinPath(),
    ['query', 'tasks', '--affected', '--downstream', 'deep', '--project', project, '--id', task],
    {
      cwd: getKibanaDir(),
      encoding: 'utf8',
      maxBuffer: 30 * 1024 * 1024,
      timeout: 120000, // a cold agent first downloads moon's toolchain plugins
      input: JSON.stringify({ files }),
    }
  );

  const { options }: { options?: { affected?: { tasks?: Record<string, unknown> } } } =
    JSON.parse(output);
  const reasons = options?.affected?.tasks?.[`${project}:${task}`] as
    | Partial<MoonTaskAffectedReasons>
    | undefined;
  if (!reasons) {
    return undefined;
  }
  return { files: reasons.files ?? [], upstream: reasons.upstream ?? [] };
}

export function getAffectedProjectsMoon(
  mergeBase: string,
  includeDownstream: boolean
): Set<string> {
  const execOptions = {
    cwd: getKibanaDir(),
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
