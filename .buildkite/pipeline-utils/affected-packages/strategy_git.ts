/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execSync } from 'child_process';
import { getKibanaDir } from '../utils';
import { findModuleForPath, buildModuleDownstreamGraph } from './module_lookup';
import { UNCATEGORIZED_MODULE_ID } from './const';
import { filterIgnoredFiles } from './utils';

const isCI = !!process.env.CI?.match(/^(1|true)$/i);

const SCOUT_TEST_MARKER = '/test/scout';

export function getAffectedModulesGit({
  mergeBase,
  includeDownstream,
  ignorePatterns = [],
  commit = 'HEAD',
  ignoreUncategorizedChanges = false,
}: {
  mergeBase: string;
  includeDownstream: boolean;
  ignorePatterns?: string[];
  commit?: string;
  ignoreUncategorizedChanges?: boolean;
}): Set<string> {
  const allChangedFiles = listChangedFiles({ mergeBase, commit });

  const changedFiles = filterIgnoredFiles(allChangedFiles, ignorePatterns);

  const codeChangedModules = new Set<string>();
  const scoutTestOnlyModules = new Set<string>();

  // Pass 1: process non-scout files to populate codeChangedModules
  const deferredScoutFiles: string[] = [];

  for (const file of changedFiles) {
    if (file.includes(SCOUT_TEST_MARKER)) {
      deferredScoutFiles.push(file);
      continue;
    }
    const moduleId = findModuleForPath(file);
    if (moduleId) {
      codeChangedModules.add(moduleId);
    }
  }

  // Pass 2: scout-test files — skip findModuleForPath when module is already code-changed
  for (const file of deferredScoutFiles) {
    const moduleId = findModuleForPath(file);
    if (!moduleId || codeChangedModules.has(moduleId)) continue;
    scoutTestOnlyModules.add(moduleId);
  }

  if (ignoreUncategorizedChanges) {
    codeChangedModules.delete(UNCATEGORIZED_MODULE_ID);
    scoutTestOnlyModules.delete(UNCATEGORIZED_MODULE_ID);
  }

  if (!includeDownstream) {
    for (const id of scoutTestOnlyModules) {
      codeChangedModules.add(id);
    }
    return codeChangedModules;
  }

  const expanded = getDownstreamDependents(codeChangedModules);
  for (const id of scoutTestOnlyModules) {
    expanded.add(id);
  }
  return expanded;
}

/** Paths changed from `git merge-base mergeBase HEAD` to `commit` (plus local untracked when not CI). */
export function listChangedFiles({
  mergeBase,
  commit,
}: {
  mergeBase: string;
  commit: string;
}): string[] {
  const execOptions = {
    cwd: getKibanaDir(),
    encoding: 'utf8' as const,
    maxBuffer: 10 * 1024 * 1024,
  };

  // To avoid symmetric diffs, and only care for changes from local towards the merge base
  const actualBase = execSync(`git merge-base ${mergeBase} HEAD`, execOptions).trim();

  let fileListOutput: string;

  if (isCI) {
    fileListOutput = execSync(`git diff --name-only ${actualBase} ${commit}`, execOptions);
  } else {
    // Committed + staged + unstaged changes to tracked files, excluding deletes
    const diffOutput = execSync(`git diff --name-only ${actualBase}`, execOptions);
    // Brand new untracked files
    const untrackedOutput = execSync(`git ls-files --others --exclude-standard`, execOptions);

    fileListOutput = `${diffOutput}\n${untrackedOutput}`;
  }

  return fileListOutput
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function getDownstreamDependents(moduleIds: Set<string>): Set<string> {
  const downstreamMap = buildModuleDownstreamGraph();
  const result = new Set<string>(moduleIds);
  const queue = Array.from(moduleIds);
  const visited = new Set<string>(moduleIds);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const dependents = downstreamMap.get(current);

    if (dependents) {
      for (const dependent of dependents) {
        if (!visited.has(dependent)) {
          visited.add(dependent);
          queue.push(dependent);
          result.add(dependent);
        }
      }
    }
  }
  return result;
}
