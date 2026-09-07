/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import os from 'os';
import path from 'path';

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'empty-jest-configs-'));

// getKibanaDir() is used to resolve the (relative) config paths passed to
// filterEmptyJestConfigs; point it at our fixture root.
jest.mock('#pipeline-utils', () => ({
  getKibanaDir: () => tmpRoot,
}));

import { filterEmptyJestConfigs } from './get_tests_from_config';

/** Write a file (and any parent dirs) under the fixture root. */
const write = (relPath: string, contents: string) => {
  const abs = path.join(tmpRoot, relPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, contents);
};

/** Emit a jest config that resolves `<rootDir>` back to the fixture root. */
const writeConfig = (
  relPath: string,
  { roots, testMatch }: { roots?: string[]; testMatch?: string[] } = {}
) => {
  const rootDir = path.relative(path.dirname(path.join(tmpRoot, relPath)), tmpRoot) || '.';
  const config: Record<string, unknown> = { rootDir };
  if (roots) config.roots = roots;
  if (testMatch) config.testMatch = testMatch;
  write(relPath, `module.exports = ${JSON.stringify(config)};`);
};

afterAll(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

describe('filterEmptyJestConfigs', () => {
  it('keeps a unit config that has a .test file under its root', () => {
    writeConfig('pkg/has_tests/jest.config.js', {
      roots: ['<rootDir>/pkg/has_tests'],
    });
    write('pkg/has_tests/foo.test.ts', '');

    expect(filterEmptyJestConfigs(['pkg/has_tests/jest.config.js'])).toEqual([
      'pkg/has_tests/jest.config.js',
    ]);
  });

  it('drops a unit config whose directory only has .spec files (Kibana Jest matches .test only)', () => {
    writeConfig('pkg/spec_only/jest.config.js', {
      roots: ['<rootDir>/pkg/spec_only'],
    });
    write('pkg/spec_only/foo.spec.ts', '');

    expect(filterEmptyJestConfigs(['pkg/spec_only/jest.config.js'])).toEqual([]);
  });

  it('drops a unit config with no test files at all', () => {
    writeConfig('pkg/empty/jest.config.js', {
      roots: ['<rootDir>/pkg/empty'],
    });
    write('pkg/empty/index.ts', '');

    expect(filterEmptyJestConfigs(['pkg/empty/jest.config.js'])).toEqual([]);
  });

  it('does not count integration tests toward a unit config', () => {
    writeConfig('pkg/unit_ignores_integration/jest.config.js', {
      roots: ['<rootDir>/pkg/unit_ignores_integration'],
    });
    write('pkg/unit_ignores_integration/integration_tests/foo.test.ts', '');

    expect(filterEmptyJestConfigs(['pkg/unit_ignores_integration/jest.config.js'])).toEqual([]);
  });

  it('keeps an integration config with a .test file under integration_tests/', () => {
    writeConfig('pkg/integration/jest.integration.config.js', {
      roots: ['<rootDir>/pkg/integration'],
    });
    write('pkg/integration/integration_tests/foo.test.ts', '');

    expect(filterEmptyJestConfigs(['pkg/integration/jest.integration.config.js'])).toEqual([
      'pkg/integration/jest.integration.config.js',
    ]);
  });

  it('keeps an integration config whose root is the integration_tests directory', () => {
    writeConfig('pkg/integration_root/jest.integration.config.js', {
      roots: ['<rootDir>/pkg/integration_root/integration_tests'],
    });
    write('pkg/integration_root/integration_tests/tests/foo.test.ts', '');

    expect(filterEmptyJestConfigs(['pkg/integration_root/jest.integration.config.js'])).toEqual([
      'pkg/integration_root/jest.integration.config.js',
    ]);
  });

  it('drops an integration config whose root only has unit .test files (not under integration_tests/)', () => {
    // Mirrors alerting_v2: a plugin full of unit tests but an integration config
    // pointing at an integration_tests dir that has none.
    writeConfig('pkg/integration_no_tests/jest.integration.config.js', {
      roots: ['<rootDir>/pkg/integration_no_tests'],
    });
    write('pkg/integration_no_tests/foo.test.ts', '');

    expect(filterEmptyJestConfigs(['pkg/integration_no_tests/jest.integration.config.js'])).toEqual(
      []
    );
  });

  it('honors a config-level testMatch override (integration config matching .test at its root)', () => {
    // Mirrors the migrations/group3 config which overrides testMatch.
    writeConfig('pkg/custom_match/jest.integration.config.js', {
      roots: ['<rootDir>/pkg/custom_match'],
      testMatch: ['**/*.test.{js,mjs,ts,tsx}'],
    });
    write('pkg/custom_match/foo.test.ts', '');

    expect(filterEmptyJestConfigs(['pkg/custom_match/jest.integration.config.js'])).toEqual([
      'pkg/custom_match/jest.integration.config.js',
    ]);
  });

  it('normalizes leading-slash testMatch globs under the configured root', () => {
    writeConfig('pkg/absolute_match/jest.integration.config.js', {
      roots: ['<rootDir>/pkg/absolute_match'],
      testMatch: ['/**/integration_tests/**/*.test.{js,mjs,ts,tsx}'],
    });
    write('pkg/absolute_match/integration_tests/foo.test.ts', '');

    expect(filterEmptyJestConfigs(['pkg/absolute_match/jest.integration.config.js'])).toEqual([
      'pkg/absolute_match/jest.integration.config.js',
    ]);
  });

  it('resolves multiple roots, keeping the config if any root has tests', () => {
    writeConfig('pkg/multi_root/jest.config.js', {
      roots: ['<rootDir>/pkg/multi_root/server', '<rootDir>/pkg/multi_root/common'],
    });
    write('pkg/multi_root/common/foo.test.ts', '');

    expect(filterEmptyJestConfigs(['pkg/multi_root/jest.config.js'])).toEqual([
      'pkg/multi_root/jest.config.js',
    ]);
  });
});
