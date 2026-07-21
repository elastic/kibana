/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Minimatch } from 'minimatch';

// Don't annotate the return type as `Minimatch[]`: the installed
// @types/minimatch exports `Minimatch` as a value (not a type), and ts-node
// will reject it. Inference + `ReturnType` keeps the file ts-node-clean.
const compileMatchers = (patterns: readonly string[]) =>
  patterns.map((p) => new Minimatch(p, { dot: true }));

const matchesAny = (file: string, matchers: ReturnType<typeof compileMatchers>): boolean =>
  matchers.some((m) => m.match(file));

/**
 * Returns file paths that don't match any of the given glob patterns.
 * When `patterns` is empty, all files are returned unchanged.
 */
export function filterIgnoredFiles(files: string[], patterns: string[]): string[] {
  if (patterns.length === 0) {
    return files;
  }
  const matchers = compileMatchers(patterns);
  return files.filter((file) => !matchesAny(file, matchers));
}

/**
 * Returns true when any pattern matches any file in the list
 */
export function touchedCriticalFiles(files: string[], criticalFiles: string[]): boolean {
  const matchers = compileMatchers(criticalFiles);
  return files.some((file) => matchesAny(file, matchers));
}

/**
 * Returns true when every file matches a `scope` pattern, treating files
 * that match an `ignore` pattern as irrelevant. Returns false on an empty
 * list or as soon as a file matches neither.
 *
 * A file matching an `exclude` pattern forces `false` immediately — it sits
 * inside the scope but is deliberately treated as out-of-scope (e.g. Scout `fixtures/`).
 */
export function allChangedFilesInScope(
  files: readonly string[],
  scope: readonly string[],
  ignore: readonly string[] = [],
  exclude: readonly string[] = []
): boolean {
  const ignoreMatchers = compileMatchers(ignore);
  const scopeMatchers = compileMatchers(scope);
  const excludeMatchers = compileMatchers(exclude);
  let hasScopedChange = false;
  for (const file of files) {
    if (matchesAny(file, ignoreMatchers)) continue;
    if (matchesAny(file, excludeMatchers)) return false;
    if (!matchesAny(file, scopeMatchers)) return false;
    hasScopedChange = true;
  }
  return hasScopedChange;
}
