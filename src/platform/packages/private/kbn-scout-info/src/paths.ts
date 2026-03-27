/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { REPO_ROOT } from '@kbn/repo-info';
import path from 'node:path';

export const SCOUT_OUTPUT_ROOT = path.resolve(REPO_ROOT, '.scout');

// Servers

export const SCOUT_SERVERS_ROOT = path.resolve(SCOUT_OUTPUT_ROOT, 'servers');

// Reporting

export const SCOUT_REPORT_OUTPUT_ROOT = path.resolve(SCOUT_OUTPUT_ROOT, 'reports');
export const SCOUT_TEST_CONFIG_STATS_PATH = path.resolve(
  SCOUT_OUTPUT_ROOT,
  'test_config_stats.json'
);

// Scout definitions

export const SCOUT_PLAYWRIGHT_CONFIGS_PATH = path.resolve(
  SCOUT_OUTPUT_ROOT,
  'test_configs',
  'scout_playwright_configs.json'
);

export const PLATFORM_AND_SOLUTION_SCOUT_ROOT_PATH_GLOB =
  '{src/platform,src/core,x-pack/**}/{plugins,packages}/**/test/scout{_*,}';

export const EXAMPLE_PLUGIN_SCOUT_ROOT_PATH_GLOB = '{examples,x-pack/examples}/**/test/scout{_*,}';

export const TESTABLE_COMPONENT_SCOUT_ROOT_PATH_GLOB = `{${[
  PLATFORM_AND_SOLUTION_SCOUT_ROOT_PATH_GLOB,
  EXAMPLE_PLUGIN_SCOUT_ROOT_PATH_GLOB,
].join(',')}}`;

export const TESTABLE_COMPONENT_SCOUT_ROOT_PATH_REGEX = new RegExp(
  `(?:src|x-pack)` +
    `\/(?:(platform|core)|solutions\/(\\w+))` + // 1: platform or core, 2: solution
    `\/(plugins|packages)` + // 3: plugin or package
    `\/?(shared|private|)` + // 4: artifact visibility
    `\/([\\w|-]+(?:\\/[\\w|-]+)*)` + // 5: plugin/package name (supports nested paths like vis_types/timelion)
    `\/test\/scout(?:_([^\\/]*))?` // 6: custom target config set name
);

export const SCOUT_TEST_CATEGORIES = ['api', 'ui'];

export const SCOUT_CONFIG_PATH_GLOB =
  TESTABLE_COMPONENT_SCOUT_ROOT_PATH_GLOB +
  `/{${SCOUT_TEST_CATEGORIES.join(',')}}/{,*.}playwright.config.ts`;

export const SCOUT_CONFIG_PATH_REGEX = new RegExp(
  TESTABLE_COMPONENT_SCOUT_ROOT_PATH_REGEX.source +
    `\/(${SCOUT_TEST_CATEGORIES.join('|')})` + // 7: Scout test category
    `\/(\\w*)\\.?playwright\\.config\\.ts` // 8: Scout config type
);

export const SCOUT_CONFIG_MANIFEST_PATH_GLOB =
  TESTABLE_COMPONENT_SCOUT_ROOT_PATH_GLOB + `/.meta/{${SCOUT_TEST_CATEGORIES.join(',')}}/*.json`;

/**
 * Playwright configs under top-level `examples/` and `x-pack/examples/` (developer example plugins).
 * `module.name` for these paths is resolved from `plugin.id` in kibana.jsonc (see test_config.fromPath).
 */
export const SCOUT_EXAMPLES_PLAYWRIGHT_CONFIG_REGEX = new RegExp(
  `^(examples|x-pack/examples)/([^/]+)/test/scout(?:_([^/]*))?/(${SCOUT_TEST_CATEGORIES.join(
    '|'
  )})/(\\w*)\\.?playwright\\.config\\.ts$`
);

/**
 * Unified regex matching both platform/solution and example plugin Playwright config paths.
 * Uses named capture groups so callers can branch on `examplesRoot` to decide how to
 * resolve module metadata (kibana.jsonc vs directory-derived).
 */
export const SCOUT_UNIFIED_CONFIG_PATH_REGEX = new RegExp(
  `^(?:` +
    `(?<examplesRoot>examples|x-pack/examples)/(?<examplePlugin>[^/]+)` +
    `|` +
    `(?:src|x-pack)/(?:(?<platformOrCore>platform|core)|solutions/(?<solution>\\w+))` +
    `/(?<moduleKind>plugins|packages)/?(?<moduleVisibility>shared|private|)` +
    `/(?<moduleName>[\\w|-]+(?:\\/[\\w|-]+)*)` +
    `)` +
    `/test/scout(?:_(?<serverConfigSet>[^/]*))?` +
    `/(?<testCategory>${SCOUT_TEST_CATEGORIES.join('|')})` +
    `/(?<testConfigType>\\w*)\\.?playwright\\.config\\.ts$`
);

// Scout CI
export const SCOUT_CI_CONFIG_PATH = path.resolve(REPO_ROOT, '.buildkite', 'scout_ci_config.yml');
