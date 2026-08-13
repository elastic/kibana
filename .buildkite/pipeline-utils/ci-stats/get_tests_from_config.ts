/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { dirname, resolve } from 'path';
import * as globby from 'globby';
import minimatch from 'minimatch';
import { getKibanaDir } from '#pipeline-utils';

/**
 * IMPORTANT: this is a lightweight re-implementation of the empty-config
 * detection in
 * `src/platform/packages/shared/kbn-test/src/jest/configs/get_jest_configs.ts`
 * (`parseJestConfig` / `matchesJestRules`). It lives here because the Buildkite
 * pipeline-utils workspace does not import from `@kbn/test` at runtime, and this
 * step runs before the whole repo is built. If you change how "a jest config has
 * no tests" is decided in either place, update the other so CI scheduling (this
 * file) and `node scripts/check_jest_configs` (the @kbn/test copy) stay in
 * agreement.
 *
 * The key detail: a config only "has tests" if a test file matches its own
 * `roots` AND `testMatch`. A plain directory glob is wrong because e.g. an
 * integration config can sit in a directory full of *unit* `.test.ts` files
 * while its `roots` point at an `integration_tests/` subdir that has none.
 */

/** Test-file extensions Kibana's presets match. Kibana never matches `.spec`. */
const TEST_EXTENSIONS = '{js,mjs,ts,tsx}';

/** `testMatch` used by the base (unit) preset — see kbn-test/jest-preset.js */
const UNIT_TEST_MATCH = [`**/*.test.${TEST_EXTENSIONS}`];

/**
 * `testMatch` used by the integration presets — see
 * kbn-test/jest_integration{,_node}/jest-preset.js. Both scope matching to an
 * `integration_tests` directory.
 */
const INTEGRATION_TEST_MATCH = [`**/integration_tests/**/*.test.${TEST_EXTENSIONS}`];

/**
 * The unit preset ignores anything under an `integration_tests/` directory so a
 * plugin's unit config never counts its own integration tests.
 */
const UNIT_IGNORE = ['**/node_modules/**', '**/integration_tests/**'];
const INTEGRATION_IGNORE = ['**/node_modules/**'];

interface JestConfigRules {
  rootDir: string;
  roots: string[];
  testMatch: string[];
  ignore: string[];
}

/**
 * Parse the `rootDir` / `roots` / `testMatch` out of a jest config (mirrors the
 * fast path in `get_jest_configs.ts`). Falls back to preset-derived defaults for
 * anything the config leaves unset.
 */
function parseJestConfigRules(configAbsPath: string): JestConfigRules {
  const isIntegration = /jest\.integration\.config\.(js|ts)$/.test(configAbsPath);
  const configDir = dirname(configAbsPath);

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const config = require(configAbsPath) as {
    rootDir?: string;
    roots?: string[];
    testMatch?: string[];
  };

  const rootDir = config.rootDir ? resolve(configDir, config.rootDir) : configDir;

  const roots = (config.roots && config.roots.length ? config.roots : ['<rootDir>']).map((root) =>
    root.replace('<rootDir>', rootDir)
  );

  // A config-level testMatch overrides the preset entirely (that's how Jest
  // works), so honor it when present; otherwise use the preset default.
  const testMatch =
    config.testMatch && config.testMatch.length
      ? config.testMatch
      : isIntegration
      ? INTEGRATION_TEST_MATCH
      : UNIT_TEST_MATCH;

  return {
    rootDir,
    roots,
    testMatch,
    ignore: isIntegration ? INTEGRATION_IGNORE : UNIT_IGNORE,
  };
}

/**
 * Fast check for whether a jest config actually selects any test files, honoring
 * its `roots` and `testMatch`. Uses globby instead of Jest's full resolver
 * (readConfig + Runtime.createContext + SearchSource.getTestPaths) which is
 * ~20x slower across 1000+ configs.
 */
function hasTestFiles(configAbsPath: string): boolean {
  let rules: JestConfigRules;
  try {
    rules = parseJestConfigRules(configAbsPath);
  } catch {
    // If the config can't be required/parsed, keep it (don't silently drop) so a
    // real config is never excluded from CI due to a parsing hiccup.
    return true;
  }

  return rules.roots.some((root) => {
    const testFiles = globby.sync(UNIT_TEST_MATCH, {
      cwd: root,
      ignore: rules.ignore,
      onlyFiles: true,
      absolute: true,
    });
    const testMatch = rules.testMatch.map((pattern) =>
      pattern.replace(/<rootDir>/g, rules.rootDir)
    );

    // Jest applies testMatch to each absolute test-file path, not to paths
    // relative to each configured root. This matters when a root is itself an
    // integration_tests directory: the absolute path still contains that
    // segment, while a root-relative path does not.
    return testFiles.some((testFile) =>
      testMatch.some((pattern) => minimatch(testFile, pattern, { dot: true }))
    );
  });
}

export function filterEmptyJestConfigs(jestConfigsWithEmpties: string[]): string[] {
  const kibanaDir = getKibanaDir();
  return jestConfigsWithEmpties.filter((configPath) =>
    hasTestFiles(resolve(kibanaDir, configPath))
  );
}
