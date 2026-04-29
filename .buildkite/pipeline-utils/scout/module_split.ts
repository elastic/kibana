/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ModuleDiscoveryInfo } from './pick_scout_test_group_run_order';

/**
 * Names that, when present as a substring of a module name, cause that module to be
 * fanned out into one Buildkite step per (arch, domain) mode. These modules host long
 * end-to-end suites where running every mode in a single BK step would dominate the
 * pipeline's wall-clock time.
 *
 * Substring match (vs. exact match) keeps the behavior intentionally permissive so
 * sibling modules like `streams_app_api` are also split.
 */
export const HEAVY_MODULE_NAME_FRAGMENTS: readonly string[] = ['streams_app', 'dashboard'];

const matchesHeavyModule = (
  moduleName: string,
  fragments: readonly string[]
): boolean => fragments.some((fragment) => moduleName.includes(fragment));

const buildModeSuffix = (flag: string): string => {
  // "--arch <arch> --domain <domain>" -> "<arch>-<domain>"
  const archDomainMatch = flag.match(/--arch\s+(\S+)\s+--domain\s+(\S+)/);
  if (archDomainMatch) {
    return `${archDomainMatch[1]}-${archDomainMatch[2]}`;
  }
  return flag.replace(/^--/g, '').replace(/\s*--/g, '-').replace(/=/g, '-').replace(/\s+/g, '-');
};

export interface SplitByServerRunFlagsOptions {
  /** Substrings to match against `module.name`. Defaults to `HEAVY_MODULE_NAME_FRAGMENTS`. */
  heavyModuleFragments?: readonly string[];
}

/**
 * Splits modules whose name matches any of the configured "heavy" fragments into one
 * virtual module per supported `(arch, domain)` mode. Each split-out module:
 *   - keeps the original module's group/type/visibility/affected-status (via spread),
 *   - is renamed to `<original>-<arch>-<domain>` so Buildkite step keys remain unique,
 *   - retains only the configs that support that specific mode,
 *   - has each retained config narrowed to a single matching `serverRunFlag`.
 *
 * Non-matching modules are returned unchanged. The function is pure and does not mutate
 * its input.
 *
 * Originally lived in `kbn-scout`'s discovery CLI and was applied before saving the
 * manifest. It belongs to the scheduling layer (this package), not discovery, because
 * it shapes Buildkite steps rather than describing the codebase. Keeping it next to
 * `pickScoutTestGroupRunOrder` lets the saved manifest carry a single entry per module
 * (with the full `serverRunFlags` array), which the flaky-test planner can index by
 * config path without ambiguity.
 */
export const splitModulesByServerRunFlags = (
  modules: ModuleDiscoveryInfo[],
  options: SplitByServerRunFlagsOptions = {}
): ModuleDiscoveryInfo[] => {
  const fragments = options.heavyModuleFragments ?? HEAVY_MODULE_NAME_FRAGMENTS;

  return modules.flatMap((module) => {
    if (!matchesHeavyModule(module.name, fragments)) {
      return [module];
    }

    const allServerRunFlags = new Set<string>();
    for (const config of module.configs) {
      for (const flag of config.serverRunFlags) {
        allServerRunFlags.add(flag);
      }
    }

    if (allServerRunFlags.size === 0) {
      // Nothing to split on; preserve the original module so callers can still emit
      // the usual single BK step (or skip it via their own filtering).
      return [module];
    }

    return Array.from(allServerRunFlags).map((flag) => ({
      ...module,
      name: `${module.name}-${buildModeSuffix(flag)}`,
      configs: module.configs
        .filter((config) => config.serverRunFlags.includes(flag))
        .map((config) => ({
          ...config,
          serverRunFlags: [flag],
        })),
    }));
  });
};
