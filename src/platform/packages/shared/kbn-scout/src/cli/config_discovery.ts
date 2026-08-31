/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createFailError } from '@kbn/dev-cli-errors';
import type { Command, FlagsReader } from '@kbn/dev-cli-runner';
import { SCOUT_PLAYWRIGHT_CONFIGS_PATH } from '@kbn/scout-info';
import { testableModules } from '@kbn/scout-reporting/src/registry';
import type { ToolingLog } from '@kbn/tooling-log';
import { saveFlattenedConfigGroups, saveModuleDiscoveryInfo } from '../tests_discovery/file_utils';
import {
  filterModulesByAffectedConfigs,
  markModulesAffectedStatusFromSet,
} from '../tests_discovery/affected_modules';
import { readScoutTestingScope } from '../tests_discovery/testing_scope';
import {
  filterModulesByScoutCiConfig,
  getScoutCiExcludedConfigs,
} from '../tests_discovery/search_configs';
import {
  collectUniqueTags,
  getServerRunFlagsFromTags,
  getTestTagsForTarget,
} from '../tests_discovery/tag_utils';
import {
  countModulesByType,
  flattenModulesByServerRunFlag,
} from '../tests_discovery/transform_utils';
import type {
  FlattenedConfigGroup,
  ModuleDiscoveryInfo,
  TargetType,
} from '../tests_discovery/types';
import { TARGET_TYPES } from '../tests_discovery/types';

// Re-export types for backward compatibility
export type { FlattenedConfigGroup, ModuleDiscoveryInfo } from '../tests_discovery/types';

// Builds module discovery info from testable modules

const buildModuleDiscoveryInfo = (): ModuleDiscoveryInfo[] => {
  return testableModules.allIncludingConfigs.map((module) => ({
    name: module.name,
    group: module.group,
    type: module.type,
    configs: module.configs.map((config) => {
      const runnableTest = config.manifest.tests.find(
        (test) => test.expectedStatus === 'passed' && test.location.file.endsWith('.spec.ts')
      );

      const usesParallelWorkers = config.type === 'parallel';
      const allTags = collectUniqueTags(config.manifest.tests);

      return {
        path: config.path,
        hasTests: !!runnableTest,
        tags: allTags,
        testChannels: config.manifest.testChannels,
        serverRunFlags: [], // Will be computed from tags after cross-tag filtering
        usesParallelWorkers,
      };
    }),
  }));
};

// Filters modules by target tags and computes server run flags
const filterModulesByTargetTags = (
  modules: ModuleDiscoveryInfo[],
  targetTags: string[]
): ModuleDiscoveryInfo[] => {
  const targetTagsSet = new Set(targetTags);

  return modules
    .map((module) => ({
      ...module,
      configs: module.configs
        .filter((config) => config.tags.some((tag) => targetTagsSet.has(tag)))
        .map((config) => {
          const filteredTags = config.tags.filter((tag) => targetTagsSet.has(tag));
          return {
            ...config,
            tags: filteredTags,
            serverRunFlags: getServerRunFlagsFromTags(filteredTags),
          };
        }),
    }))
    .filter((module) => module.configs.length > 0);
};

const CUSTOM_SERVERS_PATH_PATTERN = /\/test\/scout_[^/]+/;

const filterModulesByCustomServerPaths = (
  modules: ModuleDiscoveryInfo[],
  includeCustomServers: boolean
): ModuleDiscoveryInfo[] => {
  if (includeCustomServers) {
    return modules;
  }

  return modules
    .map((module) => ({
      ...module,
      configs: module.configs.filter((config) => {
        const isCustomServerConfig = CUSTOM_SERVERS_PATH_PATTERN.test(config.path);
        return !isCustomServerConfig;
      }),
    }))
    .filter((module) => module.configs.length > 0);
};

const filterModulesByExcludedConfigPaths = (
  modules: ModuleDiscoveryInfo[],
  excludedConfigPaths: string[]
): ModuleDiscoveryInfo[] => {
  if (excludedConfigPaths.length === 0) {
    return modules;
  }

  const excludedSet = new Set(excludedConfigPaths);

  return modules
    .map((module) => ({
      ...module,
      configs: module.configs.filter((config) => !excludedSet.has(config.path)),
    }))
    .filter((module) => module.configs.length > 0);
};

const normalizeConfigPath = (configPath: string): string => configPath.trim().replace(/^\.\//, '');

const parseRequestedConfigPaths = (raw: string | undefined): string[] => {
  if (!raw) {
    return [];
  }
  return [
    ...new Set(
      raw
        .split(',')
        .map(normalizeConfigPath)
        .filter((configPath) => configPath.length > 0)
    ),
  ];
};

const filterModulesByRequestedConfigPaths = (
  modules: ModuleDiscoveryInfo[],
  requestedConfigPaths: string[]
): ModuleDiscoveryInfo[] => {
  const requestedSet = new Set(requestedConfigPaths);

  return modules
    .map((module) => ({
      ...module,
      configs: module.configs.filter((config) => requestedSet.has(config.path)),
    }))
    .filter((module) => module.configs.length > 0);
};

const assertRequestedConfigsExist = (
  modules: ModuleDiscoveryInfo[],
  requestedConfigPaths: string[]
): void => {
  const knownPaths = new Set(
    modules.flatMap((module) => module.configs.map((config) => config.path))
  );
  const missing = requestedConfigPaths.filter((configPath) => !knownPaths.has(configPath));

  if (missing.length > 0) {
    throw createFailError(
      `The following requested Scout config(s) were not found among discovered Playwright configs:\n${missing
        .map((configPath) => `- ${configPath}`)
        .join(
          '\n'
        )}\nEnsure the path is repo-relative and that a committed manifest exists for it (run 'node scripts/scout update-test-config-manifests').`
    );
  }
};

// Logs discovered modules in non-flattened format
const logDiscoveredModules = (modules: ModuleDiscoveryInfo[], log: ToolingLog): void => {
  const { plugins: pluginCount, packages: packageCount } = countModulesByType(modules);

  const finalMessage =
    modules.length === 0
      ? 'No Playwright config files found'
      : `Found Playwright config files in ${pluginCount} plugin(s) and ${packageCount} package(s)`;

  log.info(finalMessage);

  modules.forEach((module) => {
    log.info(`${module.group} / [${module.name}] ${module.type}:`);
    module.configs.forEach((config) => {
      log.info(
        `- ${config.path} (hasTests: ${config.hasTests}, tags: [${config.tags.join(', ')}])`
      );
    });
  });
};

const logFlattenedConfigs = (flattenedConfigs: FlattenedConfigGroup[], log: ToolingLog): void => {
  log.info(`Found ${flattenedConfigs.length} flattened config group(s):`);
  flattenedConfigs.forEach((group) => {
    log.info(
      `- ${group.testTarget.arch} / ${group.group} / ${group.scoutCommand}: ${group.configs.length} config(s)`
    );
  });
};

const handleFlattenedOutput = (
  filteredModules: ModuleDiscoveryInfo[],
  flagsReader: FlagsReader,
  log: ToolingLog,
  bypassCiFilter: boolean
): void => {
  // Apply CI filtering if save flag is set (for consistency with non-flattened behavior).
  // When configs are explicitly requested (--configs), the CI enabled/disabled/registration
  // state is irrelevant, so the filter is skipped entirely.
  const modulesToFlatten =
    flagsReader.boolean('save') && !bypassCiFilter
      ? filterModulesByScoutCiConfig(log, filteredModules)
      : filteredModules;

  const flattenedConfigs = flattenModulesByServerRunFlag(modulesToFlatten);

  if (flagsReader.boolean('save')) {
    saveFlattenedConfigGroups(flattenedConfigs, log);
    return;
  }

  logFlattenedConfigs(flattenedConfigs, log);
};

const handleNonFlattenedOutput = (
  filteredModules: ModuleDiscoveryInfo[],
  flagsReader: FlagsReader,
  log: ToolingLog,
  isSelective: boolean,
  bypassCiFilter: boolean
): void => {
  if (flagsReader.boolean('save')) {
    // When configs are explicitly requested (--configs), skip the CI enabled/disabled/registration
    // filter and save exactly the resolved modules.
    const filteredForCiModules = bypassCiFilter
      ? filteredModules
      : filterModulesByScoutCiConfig(log, filteredModules);
    saveModuleDiscoveryInfo(filteredForCiModules, log);

    const { plugins: savedPluginCount, packages: savedPackageCount } =
      countModulesByType(filteredForCiModules);

    const runScope = bypassCiFilter
      ? 'requested configs'
      : isSelective
      ? 'selective'
      : 'full suite';
    log.info(
      `Scout configs saved for CI (${runScope}): ${savedPluginCount} plugin(s) and ${savedPackageCount} package(s) written to '${SCOUT_PLAYWRIGHT_CONFIGS_PATH}'`
    );
    return;
  }

  if (flagsReader.boolean('validate')) {
    if (!bypassCiFilter) {
      filterModulesByScoutCiConfig(log, filteredModules);
    }
    return;
  }

  logDiscoveredModules(filteredModules, log);
};

// Discovers and processes Playwright configuration files with Scout tests
export const runDiscoverPlaywrightConfigs = (flagsReader: FlagsReader, log: ToolingLog): void => {
  const target = (flagsReader.enum('target', TARGET_TYPES) || 'all') as TargetType;
  const targetTags = getTestTagsForTarget(target);
  const flatten = flagsReader.boolean('flatten');
  const includeCustomServers = flagsReader.boolean('include-custom-servers');
  const testingScopePath = flagsReader.string('testing-scope');
  const requestedConfigPaths = parseRequestedConfigPaths(flagsReader.string('configs'));
  // Explicitly-requested configs form an allow-list: registration/enabled/disabled/excluded and
  // custom-server state are all ignored so the caller gets exactly the configs it named.
  const hasRequestedConfigs = requestedConfigPaths.length > 0;

  // Read the resolved scope produced upstream by `scout resolve-testing-scope`.
  // The CLI is intentionally a pure consumer: it never re-derives the scope
  // from raw code-changes, so the decision is computed exactly once per build.
  const scope = testingScopePath ? readScoutTestingScope(testingScopePath) : null;
  const isSelective = scope ? scope.kind !== 'full' : false;

  // Build initial module discovery info.
  const modulesWithTests = buildModuleDiscoveryInfo();

  if (hasRequestedConfigs) {
    assertRequestedConfigsExist(modulesWithTests, requestedConfigPaths);
  }

  // Annotate every module with isAffected so CI step labels can carry an
  // "affected " prefix even on full-suite runs that have a scope artifact.
  // Marking is independent of the testing scope's `kind`.
  const modulesAfterMark = scope
    ? markModulesAffectedStatusFromSet(modulesWithTests, new Set(scope.affectedModules), log)
    : modulesWithTests;

  // Translate the scope into a concrete module list for the target-tag step.
  let modulesForTargetTags: ModuleDiscoveryInfo[];
  if (hasRequestedConfigs) {
    // Explicit config allow-list wins over any testing-scope selection.
    modulesForTargetTags = filterModulesByRequestedConfigPaths(
      modulesAfterMark,
      requestedConfigPaths
    );
    log.info(
      `Scout discovery limited to ${requestedConfigPaths.length} requested config(s) (${modulesForTargetTags.length} module(s))`
    );
  } else if (!scope || scope.kind === 'full') {
    modulesForTargetTags = modulesAfterMark;
    if (!scope) {
      log.info(
        `Full suite run: all ${modulesAfterMark.length} discovered module(s) will be included (no testing-scope provided)`
      );
    }
  } else if (scope.kind === 'tests-only') {
    modulesForTargetTags = filterModulesByAffectedConfigs(
      modulesAfterMark,
      new Set(scope.affectedConfigs ?? [])
    );
    log.info(
      `Selective testing: Scout discovery limited to affected configs (${modulesForTargetTags.length} module(s))`
    );
  } else {
    // 'dependency-tree'
    modulesForTargetTags = modulesAfterMark.filter((m) => m.isAffected === true);
    log.info(
      `Selective testing: Scout discovery limited to affected modules (${modulesForTargetTags.length} of ${modulesAfterMark.length})`
    );
  }

  // Filter modules by target tags and compute server run flags
  const filteredModulesByTags = filterModulesByTargetTags(modulesForTargetTags, targetTags);
  // An explicit config allow-list bypasses the custom-server and excluded-config filters:
  // the caller named these paths on purpose, so honor them regardless of CI defaults.
  const filteredModules = hasRequestedConfigs
    ? filteredModulesByTags
    : filterModulesByCustomServerPaths(filteredModulesByTags, includeCustomServers);
  const filteredModulesWithExcludedConfigs =
    process.env.CI && !hasRequestedConfigs
      ? filterModulesByExcludedConfigPaths(filteredModules, getScoutCiExcludedConfigs())
      : filteredModules;
  // Handle output based on flatten flag
  if (flatten) {
    handleFlattenedOutput(
      filteredModulesWithExcludedConfigs,
      flagsReader,
      log,
      hasRequestedConfigs
    );
  } else {
    handleNonFlattenedOutput(
      filteredModulesWithExcludedConfigs,
      flagsReader,
      log,
      isSelective,
      hasRequestedConfigs
    );
  }
};

/**
 * CLI command to discover Playwright configuration files with Scout tests.
 *
 * This command scans the codebase for Playwright configuration files that contain
 * Scout tests, filters them based on deployment target tags, and optionally saves
 * or validates the results.
 *
 * The command supports five deployment targets:
 * - 'all': Finds configs with deployment-agnostic tags
 * - 'local': Finds configs with @local-* tags (local stateful + local serverless)
 * - 'local-stateful-only': Finds configs with @local-stateful-* tags only
 * - 'mki': Finds configs with @cloud-serverless-* tags
 * - 'ech': Finds configs with @cloud-stateful-* tags
 *
 * Output formats:
 * - Standard: Lists modules grouped by plugin/package with their configs and tags
 * - Flattened: Groups configs by deployment mode (stateful/serverless), group, and run mode
 *
 * Selective testing (PR pipelines):
 * - The selective-testing decision (full / tests-only / dependency-tree) is made
 *   upstream by `scout resolve-testing-scope`, which writes a `testing_scope.json`
 *   hand-off artifact. Pass it via --testing-scope <file>.
 *   - kind: 'full'             -> no filtering, run every module
 *   - kind: 'tests-only'       -> filter to the Playwright configs owning the diff
 *   - kind: 'dependency-tree'  -> filter to modules in scope.affectedModules
 *   In all cases, scope.affectedModules is used to mark each module's `isAffected`
 *   flag so CI step labels can carry an "affected " prefix.
 */
export const discoverPlaywrightConfigsCmd: Command<void> = {
  name: 'discover-playwright-configs',
  description: `
  Discover Playwright configuration files with Scout tests.

  This command scans for Playwright config files containing Scout tests and filters them
  based on deployment target tags. It can output results in standard or flattened format,
  validate against CI configuration, or save filtered results to a file.

  Options:
    --target <target>         Filter configs by deployment target:
                              - 'all': deployment-agnostic tags (default)
                              - 'local': @local-* tags (local stateful + local serverless)
                              - 'local-stateful-only': @local-stateful-* tags only
                              - 'mki': @cloud-serverless-* tags
                              - 'ech': @cloud-stateful-* tags
    --testing-scope <file>    Path to a 'testing_scope.json' file produced upstream
                              by 'scout resolve-testing-scope'. Drives both filtering
                              (per kind: full / tests-only / dependency-tree) and
                              isAffected marking (from scope.affectedModules).
                              When omitted, the command runs in full-suite mode
                              with no isAffected marking.
    --configs <paths>         Comma-separated repo-relative Playwright config paths to resolve.
                              Acts as an explicit allow-list: only these configs are output, and
                              custom-server, excluded-config, and CI registration/enabled/disabled
                              filtering are bypassed (the caller named them on purpose). Fails if a
                              requested path is not a known Scout config. Used by the flaky-test runner.
    --include-custom-servers  Include configs under 'test/scout_*' paths for custom server setups
    --validate                Validate that all discovered modules are registered in Scout CI config
    --save                    Validate and save enabled modules to '${SCOUT_PLAYWRIGHT_CONFIGS_PATH}'
    --flatten                 Output configs in flattened format grouped by mode, group, and scout command
                              (useful for Cloud test execution)

  Examples:
    # Discover all deployment-agnostic configs
    node scripts/scout discover-playwright-configs

    # Discover configs for local targets (@local-*)
    node scripts/scout discover-playwright-configs --target local

    # Save filtered configs for CI use
    node scripts/scout discover-playwright-configs --save

    # PR pipeline: selective testing driven by the upstream scope artifact
    node scripts/scout discover-playwright-configs \\
      --testing-scope .scout/testing_scope.json --save

    # Save flattened configs for Cloud test execution
    node scripts/scout discover-playwright-configs --flatten --save

    # Resolve only specific configs (flaky-test runner); bypasses CI registration/enabled filtering
    node scripts/scout discover-playwright-configs --target local --save \\
      --configs x-pack/plugins/foo/test/scout/ui/playwright.config.ts,src/plugins/bar/test/scout/api/playwright.config.ts
  `,
  flags: {
    string: ['target', 'testing-scope', 'configs'],
    boolean: ['save', 'validate', 'flatten', 'include-custom-servers'],
    default: {
      target: 'all',
      save: false,
      validate: false,
      flatten: false,
      'include-custom-servers': false,
    },
  },
  run: ({ flagsReader, log }) => {
    runDiscoverPlaywrightConfigs(flagsReader, log);
  },
};
