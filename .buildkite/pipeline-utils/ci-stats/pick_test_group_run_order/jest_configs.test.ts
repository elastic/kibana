/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Os from 'os';
import Path from 'path';

jest.mock('../../load_buildkite_json.ts', () => ({
  loadBuildkiteJson: jest.fn(() => []),
}));

let mockKibanaDir = process.cwd();

jest.mock('#pipeline-utils', () => ({
  getKibanaDir: () => mockKibanaDir,
}));

import {
  discoverJestIntegrationConfigs,
  discoverJestUnitConfigs,
  globsForSolutions,
} from './jest_configs.ts';

describe('globsForSolutions', () => {
  const PATTERNS = ['**/jest.config.js', '!**/__fixtures__/**'];

  it('returns patterns unchanged when limitSolutions is undefined', () => {
    expect(globsForSolutions(PATTERNS, undefined)).toEqual(PATTERNS);
  });

  it('prefixes positive patterns with solution and platform paths', () => {
    const result = globsForSolutions(PATTERNS, ['security']);
    expect(result).toContain('x-pack/solutions/security/**/jest.config.js');
    expect(result).toContain('src/**/jest.config.js');
    expect(result).toContain('x-pack/platform/**/jest.config.js');
  });

  it('keeps negation patterns unprefixed so globby treats them as exclusions', () => {
    const result = globsForSolutions(PATTERNS, ['security']);
    // must appear as-is, not as 'src/!**/__fixtures__/**' etc.
    expect(result).toContain('!**/__fixtures__/**');
    expect(result.filter((p) => p.startsWith('!'))).toEqual(['!**/__fixtures__/**']);
  });

  it('includes platform patterns even when multiple solutions are listed', () => {
    const result = globsForSolutions(PATTERNS, ['security', 'observability']);
    expect(result).toContain('src/**/jest.config.js');
    expect(result).toContain('x-pack/platform/**/jest.config.js');
  });
});

describe('discoverJestUnitConfigs', () => {
  let originalCwd: string;
  let repoRoot: string;
  let otherCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    repoRoot = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'jest-config-repo-'));
    otherCwd = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'jest-config-cwd-'));
    mockKibanaDir = repoRoot;
  });

  afterEach(() => {
    process.chdir(originalCwd);
    Fs.rmSync(repoRoot, { recursive: true, force: true });
    Fs.rmSync(otherCwd, { recursive: true, force: true });
    mockKibanaDir = originalCwd;
  });

  it('discovers configs from the Kibana directory, not the process cwd', () => {
    Fs.mkdirSync(Path.join(repoRoot, 'pkg/has_tests'), { recursive: true });
    Fs.writeFileSync(Path.join(repoRoot, 'pkg/has_tests/jest.config.js'), 'module.exports = {};');
    Fs.writeFileSync(Path.join(repoRoot, 'pkg/has_tests/foo.test.ts'), '');

    process.chdir(otherCwd);

    expect(discoverJestUnitConfigs(undefined)).toEqual(['pkg/has_tests/jest.config.js']);
  });

  it('discovers CommonJS configs', () => {
    Fs.mkdirSync(Path.join(repoRoot, 'pkg/unit'), { recursive: true });
    Fs.writeFileSync(Path.join(repoRoot, 'pkg/unit/jest.config.cjs'), 'module.exports = {};');
    Fs.writeFileSync(Path.join(repoRoot, 'pkg/unit/foo.test.ts'), '');
    Fs.mkdirSync(Path.join(repoRoot, 'pkg/integration'), { recursive: true });
    Fs.writeFileSync(
      Path.join(repoRoot, 'pkg/integration/jest.integration.config.cjs'),
      'module.exports = {};'
    );
    Fs.mkdirSync(Path.join(repoRoot, 'pkg/integration/integration_tests'));
    Fs.writeFileSync(Path.join(repoRoot, 'pkg/integration/integration_tests/foo.test.ts'), '');

    expect(discoverJestUnitConfigs(undefined)).toEqual(['pkg/unit/jest.config.cjs']);
    expect(discoverJestIntegrationConfigs(undefined)).toEqual([
      'pkg/integration/jest.integration.config.cjs',
    ]);
  });
});
