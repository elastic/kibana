/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Command, FlagsReader } from '@kbn/dev-cli-runner';
import { SCOUT_PLAYWRIGHT_CONFIGS_PATH } from '@kbn/scout-info';
import { testableModules } from '@kbn/scout-reporting/src/registry';
import type { ToolingLog } from '@kbn/tooling-log';
import { saveFlattenedConfigGroups, saveModuleDiscoveryInfo } from '../tests_discovery/file_utils';
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

// Splits 'streams_app' module by 'serverRunFlags' so CI can run each arch/domain as a
// separate job (e.g. streams_app-stateful-classic, streams_app-serverless-search).
const splitStreamsTestsByServerRunFlags = (
  modules: ModuleDiscoveryInfo[]
): ModuleDiscoveryInfo[] => {
  return modules.flatMap((module) => {
    // It is a temp workaround. Only split modules that include 'streams_app', 'dashboard'  in their name
    if (!module.name.includes('streams_app') && !module.name.includes('dashboard')) {
      return [module];
    }

    const allServerRunFlags = new Set<string>();
    module.configs.forEach((config) => {
      config.serverRunFlags.forEach((flag) => allServerRunFlags.add(flag));
    });

    return Array.from(allServerRunFlags).map((flag) => {
      // transform: "--arch <arch> --domain <domain>" -> "<arch>-<domain>"
      const archDomainMatch = flag.match(/--arch\s+(\S+)\s+--domain\s+(\S+)/);
      const flagSuffix = archDomainMatch
        ? `${archDomainMatch[1]}-${archDomainMatch[2]}`
        : flag.replace(/^--/g, '').replace(/\s*--/g, '-').replace(/=/g, '-').replace(/\s+/g, '-');
      const newModuleName = `${module.name}-${flagSuffix}`;

      const filteredConfigs = module.configs
        .filter((config) => config.serverRunFlags.includes(flag))
        .map((config) => ({
          ...config,
          // Keep only the matching 'serverRunFlag' for this split module
          serverRunFlags: [flag],
        }));

      return {
        ...module,
        name: newModuleName,
        configs: filteredConfigs,
      };
    });
  });
};

const handleNonFlattenedOutput = (
  filteredModules: ModuleDiscoveryInfo[],
  flagsReader: FlagsReader,
  log: ToolingLog
): void => {
  if (flagsReader.boolean('save')) {
    const filteredForCiModules = filterModulesByScoutCiConfig(log, filteredModules);
    // 'streams_app' tests are quite time consuming, let's split run by 'serverRunFlags' before saving
    const splitModules = splitStreamsTestsByServerRunFlags(filteredForCiModules);
    saveModuleDiscoveryInfo(splitModules, log);

    const { plugins: savedPluginCount, packages: savedPackageCount } =
      countModulesByType(splitModules);

    log.info(
      `Scout configs were filtered for CI. Saved ${savedPluginCount} plugin(s) and ${savedPackageCount} package(s) to '${SCOUT_PLAYWRIGHT_CONFIGS_PATH}'`
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

  // Build initial module discovery info
  const modulesWithTests = buildModuleDiscoveryInfo();
  // Filter modules by target tags and compute server run flags
  const filteredModulesByTags = filterModulesByTargetTags(modulesWithTests, targetTags);
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
    handleNonFlattenedOutput(filteredModulesWithExcludedConfigs, flagsReader, log);
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
  `,
  flags: {
    string: ['target'],
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
