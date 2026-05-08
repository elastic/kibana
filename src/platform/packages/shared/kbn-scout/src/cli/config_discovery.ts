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
import { markModulesAffectedStatus } from '../tests_discovery/affected_modules';
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
  log: ToolingLog
): void => {
  // Apply CI filtering if save flag is set (for consistency with non-flattened behavior)
  const modulesToFlatten = flagsReader.boolean('save')
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
  selectiveTesting: boolean
): void => {
  if (flagsReader.boolean('save')) {
    const filteredForCiModules = filterModulesByScoutCiConfig(log, filteredModules);
    saveModuleDiscoveryInfo(filteredForCiModules, log);

    const { plugins: savedPluginCount, packages: savedPackageCount } =
      countModulesByType(filteredForCiModules);

    const runScope = selectiveTesting ? 'selective' : 'full suite';
    log.info(
      `Scout configs saved for CI (${runScope}): ${savedPluginCount} plugin(s) and ${savedPackageCount} package(s) written to '${SCOUT_PLAYWRIGHT_CONFIGS_PATH}'`
    );
    return;
  }

  if (flagsReader.boolean('validate')) {
    filterModulesByScoutCiConfig(log, filteredModules);
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
  const selectiveTesting = flagsReader.boolean('selective-testing');
  const affectedModulesPath = flagsReader.string('affected-modules');

  if (selectiveTesting && !affectedModulesPath) {
    throw createFailError(
      '--selective-testing requires --affected-modules (JSON array of @kbn/ IDs from list_affected).'
    );
  }

  // Build initial module discovery info
  const modulesWithTests = buildModuleDiscoveryInfo();

  // --affected-modules: keep every Scout module that passes target/CI filters; set isAffected
  // per module so CI step labels can use an "affected " prefix where the PR touched that @kbn/ ID.
  const modulesAfterAffectedMark = affectedModulesPath
    ? markModulesAffectedStatus(modulesWithTests, affectedModulesPath, log)
    : modulesWithTests;

  // --selective-testing: narrow to affected module groups only.
  const limitDiscoveryToAffectedModules = selectiveTesting;

  const modulesForTargetTags = limitDiscoveryToAffectedModules
    ? modulesAfterAffectedMark.filter((m) => m.isAffected === true)
    : modulesAfterAffectedMark;

  if (limitDiscoveryToAffectedModules) {
    log.info(
      `Selective testing: Scout discovery limited to affected modules (${modulesForTargetTags.length} of ${modulesAfterAffectedMark.length})`
    );
  } else {
    log.info(
      `Full suite run: all ${modulesAfterAffectedMark.length} discovered module(s) will be included (selective testing is disabled)`
    );
  }

  // Filter modules by target tags and compute server run flags
  const filteredModulesByTags = filterModulesByTargetTags(modulesForTargetTags, targetTags);
  const filteredModules = filterModulesByCustomServerPaths(
    filteredModulesByTags,
    includeCustomServers
  );
  const filteredModulesWithExcludedConfigs = process.env.CI
    ? filterModulesByExcludedConfigPaths(filteredModules, getScoutCiExcludedConfigs())
    : filteredModules;
  // Handle output based on flatten flag
  if (flatten) {
    handleFlattenedOutput(filteredModulesWithExcludedConfigs, flagsReader, log);
  } else {
    handleNonFlattenedOutput(
      filteredModulesWithExcludedConfigs,
      flagsReader,
      log,
      selectiveTesting
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
 * Affected modules:
 * - With --affected-modules, all modules are still considered; isAffected flags drive the
 *   "affected " Buildkite step prefix. With --selective-testing, only affected module groups
 *   are emitted; those steps keep the same prefix.
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
    --affected-modules <file>  Path to a JSON file of affected @kbn/ module IDs (list_affected).
                              All Scout modules still go through discovery; each module is marked
                              isAffected so CI can prefix steps with "affected " when the PR
                              touches that module. Combine with --selective-testing to emit only
                              affected module groups.
    --selective-testing       Requires --affected-modules.
                              Limits output / Scout CI steps to affected modules; labels unchanged.
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

    # Discover only local stateful configs (@local-stateful-*)
    node scripts/scout discover-playwright-configs --target local-stateful-only

    # Discover cloud serverless configs (@cloud-serverless-*)
    node scripts/scout discover-playwright-configs --target mki

    # Discover cloud stateful configs (@cloud-stateful-*)
    node scripts/scout discover-playwright-configs --target ech

    # Discover local custom-server configs only
    node scripts/scout discover-playwright-configs --include-custom-servers

    # Validate discovered configs against CI configuration
    node scripts/scout discover-playwright-configs --validate

    # Save filtered configs for CI use
    node scripts/scout discover-playwright-configs --save

    # Save flattened configs for Cloud test execution
    node scripts/scout discover-playwright-configs --flatten --save

    # Affected-module labels on every Scout group (full CI matrix)
    node scripts/scout discover-playwright-configs --affected-modules .scout/affected_modules.json --save

    # Only affected module groups (selective testing for PRs)
    node scripts/scout discover-playwright-configs --affected-modules .scout/affected_modules.json --selective-testing --save
  `,
  flags: {
    string: ['target', 'affected-modules'],
    boolean: ['save', 'validate', 'flatten', 'include-custom-servers', 'selective-testing'],
    default: {
      target: 'all',
      save: false,
      validate: false,
      flatten: false,
      'include-custom-servers': false,
      'selective-testing': false,
    },
  },
  run: ({ flagsReader, log }) => {
    runDiscoverPlaywrightConfigs(flagsReader, log);
  },
};
