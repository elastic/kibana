/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import path from 'path';
import type { Command, FlagsReader } from '@kbn/dev-cli-runner';
import { SCOUT_PLAYWRIGHT_CONFIGS_PATH } from '@kbn/scout-info';
import { testableModules } from '@kbn/scout-reporting/src/registry';
import type { ToolingLog } from '@kbn/tooling-log';
import { tags } from '../playwright/tags';
import { filterModulesByScoutCiConfig } from '../servers/configs/discovery';

type TargetType = 'all' | 'mki' | 'ech';

const TARGET_TYPES: TargetType[] = ['all', 'mki', 'ech'];

const getTestTagsForTarget = (target: string): string[] => {
  switch (target) {
    case 'mki':
      return tags.SERVERLESS_ONLY;
    case 'ech':
      return tags.ESS_ONLY;
    case 'all':
    default:
      return tags.DEPLOYMENT_AGNOSTIC;
  }
};

const collectUniqueTags = (
  tests: Array<{ tags?: string[]; expectedStatus?: string; location?: { file?: string } }>
): string[] => {
  const tagSet = new Set<string>();
  for (const test of tests) {
    // Only collect tags from tests that have passed status and are spec files
    if (
      test.expectedStatus === 'passed' &&
      test.location?.file?.endsWith('.spec.ts') &&
      test.tags
    ) {
      for (const tag of test.tags) {
        tagSet.add(tag);
      }
    }
  }
  return Array.from(tagSet);
};

const countModulesByType = (
  modules: ModuleDiscoveryInfo[]
): { plugins: number; packages: number } => {
  let plugins = 0;
  let packages = 0;
  for (const module of modules) {
    if (module.type === 'plugin') {
      plugins++;
    } else {
      packages++;
    }
  }
  return { plugins, packages };
};

/**
 * Converts tags to run modes (e.g., --stateful, --serverless=es)
 */
const getRunModesFromTags = (testTags: string[]): string[] => {
  const modes: string[] = [];
  const tagSet = new Set(testTags);

  // Map tags to run modes
  if (tagSet.has('@ess')) {
    modes.push('--stateful');
  }
  if (tagSet.has('@svlSearch')) {
    modes.push('--serverless=es');
  }
  if (tagSet.has('@svlSecurity')) {
    modes.push('--serverless=security');
  }
  if (tagSet.has('@svlOblt')) {
    modes.push('--serverless=oblt');
  }
  // TODO: Uncomment to run tests for these targets in CI
  //
  // if (tagSet.has('@svlLogsEssentials')) {
  //   modes.push('--serverless=oblt-logs-essentials');
  // }
  // if (tagSet.has('@svlSecurityEssentials')) {
  //   modes.push('--serverless=security-essentials');
  // }
  // if (tagSet.has('@svlSecurityEase')) {
  //   modes.push('--serverless=security-ease');
  // }

  return modes;
};

// It is used in regular CI pipelines with locally run servers
export interface ModuleDiscoveryInfo {
  name: string;
  group: string;
  type: 'plugin' | 'package';
  configs: {
    path: string;
    hasTests: boolean;
    tags: string[];
    runModes: string[];
    usesParallelWorkers: boolean;
  }[];
}

// It is used in CI pipelines targeting test runs in Cloud
export interface FlattenedConfigGroup {
  mode: 'serverless' | 'stateful';
  group: string;
  runMode: string;
  configs: string[];
}

/**
 * Flattens ModuleDiscoveryInfo[] into an array grouped by mode, group, and runMode to qaf-tests run
 */
const flattenModulesByRunMode = (modules: ModuleDiscoveryInfo[]): FlattenedConfigGroup[] => {
  // Using a map with composite key: `${mode}:${group}:${runMode}`
  const groupsMap = new Map<string, FlattenedConfigGroup>();

  for (const module of modules) {
    for (const config of module.configs) {
      for (const runMode of config.runModes) {
        const mode: 'serverless' | 'stateful' = runMode.startsWith('--serverless')
          ? 'serverless'
          : 'stateful';

        const key = `${mode}:${module.group}:${runMode}`;

        // Get or create group
        let group = groupsMap.get(key);
        if (!group) {
          group = {
            mode,
            group: module.group,
            runMode,
            configs: [],
          };
          groupsMap.set(key, group);
        }

        // Add config path to group
        group.configs.push(config.path);
      }
    }
  }

  // Convert map to array and sort for consistent output
  return Array.from(groupsMap.values()).sort((a, b) => {
    // Sort by mode first (stateful before serverless), then by group, then by runMode (alphabetical)
    if (a.mode !== b.mode) {
      return a.mode === 'stateful' ? -1 : 1;
    }
    if (a.group !== b.group) {
      return a.group.localeCompare(b.group);
    }
    return a.runMode.localeCompare(b.runMode);
  });
};

export const runDiscoverPlaywrightConfigs = (flagsReader: FlagsReader, log: ToolingLog) => {
  const target = (flagsReader.enum('target', TARGET_TYPES) || 'all') as TargetType;
  const targetTags = getTestTagsForTarget(target);
  const targetTagsSet = new Set(targetTags);
  const flatten = flagsReader.boolean('flatten');

  const modulesWithTests: ModuleDiscoveryInfo[] = testableModules.allIncludingConfigs.map(
    (module) => ({
      name: module.name,
      group: module.group,
      type: module.type,
      configs: module.configs.map((config) => {
        const runnableTest = config.manifest.tests.find(
          (test) => test.expectedStatus === 'passed' && test.location.file.endsWith('.spec.ts')
        );

        const usesParallelWorkers = config.path.includes('parallel.playwright.config.ts');
        const allTags = collectUniqueTags(config.manifest.tests);

        return {
          path: config.path,
          hasTests: !!runnableTest,
          tags: allTags,
          runModes: [], // It will be computed from tags after cross-tag filtering
          usesParallelWorkers,
        };
      }),
    })
  );

  // Filter configs based on matching tags with targetTags
  // Keep only configs with matching tags, and filter each config's tags to only include cross tags
  // Compute runModes from the filtered tags
  const filteredModulesWithTests = modulesWithTests
    .map((module) => ({
      ...module,
      configs: module.configs
        .filter((config) => config.tags.some((tag) => targetTagsSet.has(tag)))
        .map((config) => {
          const filteredTags = config.tags.filter((tag) => targetTagsSet.has(tag));
          return {
            ...config,
            tags: filteredTags,
            runModes: getRunModesFromTags(filteredTags),
          };
        }),
    }))
    .filter((module) => module.configs.length > 0);

  // If flatten flag is set, transform to flattened format
  if (flatten) {
    // Apply CI filtering if save flag is set (for consistency with non-flattened behavior)
    const modulesToFlatten = flagsReader.boolean('save')
      ? filterModulesByScoutCiConfig(log, filteredModulesWithTests)
      : filteredModulesWithTests;

    const flattenedConfigs = flattenModulesByRunMode(modulesToFlatten);

    if (flagsReader.boolean('save')) {
      const dirPath = path.dirname(SCOUT_PLAYWRIGHT_CONFIGS_PATH);

      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      fs.writeFileSync(SCOUT_PLAYWRIGHT_CONFIGS_PATH, JSON.stringify(flattenedConfigs, null, 2));

      const statefulCount = flattenedConfigs.filter((g) => g.mode === 'stateful').length;
      const serverlessCount = flattenedConfigs.filter((g) => g.mode === 'serverless').length;
      const totalConfigs = flattenedConfigs.reduce((sum, g) => sum + g.configs.length, 0);

      log.info(
        `Scout configs flattened and saved: ${statefulCount} stateful group(s), ${serverlessCount} serverless group(s), ${totalConfigs} total config(s) to '${SCOUT_PLAYWRIGHT_CONFIGS_PATH}'`
      );

      return;
    }

    // If not saving, just log the flattened structure
    log.info(`Found ${flattenedConfigs.length} flattened config group(s):`);
    flattenedConfigs.forEach((group) => {
      log.info(
        `- ${group.mode} / ${group.group} / ${group.runMode}: ${group.configs.length} config(s)`
      );
    });

    return;
  }

  // Original non-flattened logic for regular CI runs (only until we introduce Scout balancer)
  const { plugins: pluginCount, packages: packageCount } =
    countModulesByType(filteredModulesWithTests);

  const finalMessage =
    filteredModulesWithTests.length === 0
      ? 'No Playwright config files found'
      : `Found Playwright config files in ${pluginCount} plugin(s) and ${packageCount} package(s)`;

  if (!flagsReader.boolean('save')) {
    log.info(finalMessage);

    filteredModulesWithTests.forEach((module) => {
      log.info(`${module.group} / [${module.name}] ${module.type}:`);
      module.configs.forEach((config) => {
        log.info(
          `- ${config.path} (hasTests: ${config.hasTests}, tags: [${config.tags.join(', ')}])`
        );
      });
    });
  }

  if (flagsReader.boolean('save')) {
    const filteredForCiModules = filterModulesByScoutCiConfig(log, filteredModulesWithTests);

    const dirPath = path.dirname(SCOUT_PLAYWRIGHT_CONFIGS_PATH);

    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    fs.writeFileSync(SCOUT_PLAYWRIGHT_CONFIGS_PATH, JSON.stringify(filteredForCiModules, null, 2));

    const { plugins: savedPluginCount, packages: savedPackageCount } =
      countModulesByType(filteredForCiModules);

    log.info(
      `Scout configs were filtered for CI. Saved ${savedPluginCount} plugin(s) and ${savedPackageCount} package(s) to '${SCOUT_PLAYWRIGHT_CONFIGS_PATH}'`
    );

    return;
  }

  if (flagsReader.boolean('validate')) {
    filterModulesByScoutCiConfig(log, filteredModulesWithTests);
  }
};

/**
 * Discover Playwright configuration files with Scout tests
 */
export const discoverPlaywrightConfigsCmd: Command<void> = {
  name: 'discover-playwright-configs',
  description: `
  Discover Playwright configuration files with Scout tests.

  Options:
    --target <target>  Filter configs by deployment target:
                       - 'all': deployment-agnostic tags (default)
                       - 'mki': serverless-only tags (MKI)
                       - 'ech': ESS-only tags (ECH)
    --validate         Validate that all discovered modules are registered in Scout CI config
    --save             Validate and save enabled modules to '${SCOUT_PLAYWRIGHT_CONFIGS_PATH}'
    --flatten          Output configs in flattened format grouped by mode, group, and runMode

  Common usage:
    node scripts/scout discover-playwright-configs
    node scripts/scout discover-playwright-configs --target mki
    node scripts/scout discover-playwright-configs --validate
    node scripts/scout discover-playwright-configs --save
    node scripts/scout discover-playwright-configs --flatten --save
  `,
  flags: {
    string: ['target'],
    boolean: ['save', 'validate', 'flatten'],
    default: { target: 'all', save: false, validate: false, flatten: false },
  },
  run: ({ flagsReader, log }) => {
    runDiscoverPlaywrightConfigs(flagsReader, log);
  },
};
