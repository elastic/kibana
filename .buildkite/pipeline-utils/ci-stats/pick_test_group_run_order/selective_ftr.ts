/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  findModuleForPath,
  getAffectedPackages,
  getModuleGroup,
  listChangedFiles,
  touchedCriticalFiles,
  UNCATEGORIZED_MODULE_ID,
} from '../../affected-packages';
import { CRITICAL_FILES_FTR, PLATFORM_GROUP, SOLUTION_GROUPS } from './const';

const SOLUTION_GROUP_SET: ReadonlySet<string> = new Set<string>(SOLUTION_GROUPS);

/**
 * `x-pack/solutions/<solution>/...` — used to attribute changes that fall
 * outside any registered module (e.g. functional test dirs that have no
 * `kibana.jsonc`) to the owning solution by directory.
 */
const SOLUTION_PATH_RE = /^x-pack\/solutions\/([^/]+)\//;

export interface FtrSolutionSelection {
  /**
   * The solution `group`s the PR is confined to, or `null` when the diff cannot
   * be safely narrowed to solutions — in which case callers must run the full
   * FTR suite (blocking), exactly as today.
   */
  solutions: Set<string> | null;
  /** Human-readable explanation, surfaced as a Buildkite annotation. */
  reason: string;
}

/**
 * Decide which solution(s) a PR's diff is confined to, for FTR selection.
 *
 * Returns `null` (run everything, blocking) whenever the change could plausibly
 * affect more than the touched solutions:
 *  - a critical shared/CI/test-infra file changed,
 *  - any changed file maps to the `platform` group or to no solution at all,
 *  - a downstream dependent of a changed module lives in `platform` or an
 *    unrecognized group.
 *
 * This is intentionally conservative: solutions are `visibility: private` and
 * cannot depend on one another, so a diff that stays inside a single solution's
 * code cannot break another solution — but anything touching shared/platform
 * code can, so we fall back to the full suite there.
 */
export async function resolveAffectedFtrSolutions(
  mergeBase: string
): Promise<FtrSolutionSelection> {
  let changedFiles: string[];
  try {
    changedFiles = listChangedFiles({ mergeBase, commit: 'HEAD' });
  } catch (error) {
    return bail(`unable to list changed files (${errorMessage(error)})`);
  }

  if (changedFiles.length === 0) {
    return bail('no changed files detected');
  }

  if (touchedCriticalFiles(changedFiles, CRITICAL_FILES_FTR)) {
    return bail('critical shared/CI/test-infra files changed');
  }

  const solutions = new Set<string>();

  // 1) Attribute every changed file to a solution. Any file that isn't owned by
  //    a solution (platform, shared, root tooling, …) disqualifies narrowing.
  for (const file of changedFiles) {
    const group = solutionForFile(file);
    if (group === null) {
      return bail(`change outside any solution: ${file}`);
    }
    solutions.add(group);
  }

  // 2) Expand through the downstream dependency graph. If a changed module is
  //    consumed by a module in another group, that group must be covered too;
  //    a platform/shared consumer means the change can reach everything.
  let affected: Set<string>;
  try {
    affected = await getAffectedPackages(mergeBase, {
      strategy: 'git',
      includeDownstream: true,
      ignorePatterns: [],
      // Files outside modules are handled by the path-based loop above.
      ignoreUncategorizedChanges: true,
    });
  } catch (error) {
    return bail(`affected-package detection failed (${errorMessage(error)})`);
  }

  for (const moduleId of affected) {
    if (moduleId === UNCATEGORIZED_MODULE_ID) {
      continue;
    }
    const group = getModuleGroup(moduleId);
    if (!group || group === PLATFORM_GROUP) {
      return bail(`platform/shared module affected: ${moduleId}`);
    }
    if (!SOLUTION_GROUP_SET.has(group)) {
      return bail(`unrecognized group "${group}" for module ${moduleId}`);
    }
    solutions.add(group);
  }

  if (solutions.size === 0) {
    return bail('no affected solutions resolved');
  }

  return {
    solutions,
    reason: `diff confined to solution(s): ${[...solutions].sort().join(', ')}`,
  };
}

/**
 * Flatten the queue→configs map into a single list of config paths.
 */
export function flattenConfigPaths(byQueue: Map<string, string[]>): string[] {
  return Array.from(byQueue.values()).flat();
}

/**
 * Config paths present in `full` but not in `blocking` — i.e. the configs that
 * belong to untouched solutions and should be made non-blocking (soft-fail).
 */
export function diffSoftFailConfigs(
  full: Map<string, string[]>,
  blocking: Map<string, string[]>
): string[] {
  const blockingSet = new Set(flattenConfigPaths(blocking));
  return flattenConfigPaths(full).filter((path) => !blockingSet.has(path));
}

/**
 * Resolve a changed file to its owning solution `group`, or `null` when it is
 * not owned by a solution (platform/shared/uncategorized).
 */
function solutionForFile(file: string): string | null {
  const solutionMatch = SOLUTION_PATH_RE.exec(file);
  if (solutionMatch) {
    const dir = solutionMatch[1];
    return SOLUTION_GROUP_SET.has(dir) ? dir : null;
  }

  const moduleId = findModuleForPath(file);
  if (!moduleId || moduleId === UNCATEGORIZED_MODULE_ID) {
    return null;
  }

  const group = getModuleGroup(moduleId);
  if (!group || group === PLATFORM_GROUP || !SOLUTION_GROUP_SET.has(group)) {
    return null;
  }
  return group;
}

function bail(reason: string): FtrSolutionSelection {
  return { solutions: null, reason };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
