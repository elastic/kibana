/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';

/**
 * Unit tests to verify that the RSPack cache invalidation configuration
 * includes all required build dependencies.
 *
 * These tests verify the SOURCE FILES exist and are referenced in the config.
 * They don't test actual RSPack behavior - that would require integration tests.
 *
 * The cache should be invalidated when:
 * 1. Shared deps are rebuilt (kbn-ui-shared-deps-npm, kbn-ui-shared-deps-src)
 * 2. Externals configuration changes
 * 3. RSPack config files change
 */
describe('RSPack cache invalidation configuration', () => {
  // Files that MUST exist and be in buildDependencies for proper cache invalidation
  const REQUIRED_SOURCE_FILES = [
    // RSPack optimizer config files
    'packages/kbn-rspack-optimizer/src/config/externals.ts',
    'packages/kbn-rspack-optimizer/src/config/shared_config.ts',
    'packages/kbn-rspack-optimizer/src/config/create_single_compile_config.ts',
    // Shared deps source files
    'src/platform/packages/private/kbn-ui-shared-deps-src/src/entry.js',
    'src/platform/packages/private/kbn-ui-shared-deps-src/src/definitions.js',
  ];

  // Built files that should be in buildDependencies (may not exist in fresh checkout)
  const REQUIRED_BUILD_DEPENDENCY_PATTERNS = [
    'kbn-ui-shared-deps-npm.dll.js',
    'kbn-ui-shared-deps-src.js',
  ];

  describe('required source files exist', () => {
    for (const relativePath of REQUIRED_SOURCE_FILES) {
      it(`${relativePath} should exist`, () => {
        const absolutePath = Path.resolve(REPO_ROOT, relativePath);
        expect(Fs.existsSync(absolutePath)).toBe(true);
      });
    }
  });

  describe('create_single_compile_config.ts references required files', () => {
    let configSource: string;

    beforeAll(() => {
      const configPath = Path.resolve(
        REPO_ROOT,
        'packages/kbn-rspack-optimizer/src/config/create_single_compile_config.ts'
      );
      configSource = Fs.readFileSync(configPath, 'utf-8');
    });

    it('should have buildDependencies configuration', () => {
      expect(configSource).toContain('buildDependencies');
    });

    it('should include externals.ts in buildDependencies', () => {
      expect(configSource).toContain('externals.ts');
    });

    it('should include shared_config.ts in buildDependencies', () => {
      expect(configSource).toContain('shared_config.ts');
    });

    it('should include shared deps built outputs in buildDependencies', () => {
      for (const pattern of REQUIRED_BUILD_DEPENDENCY_PATTERNS) {
        expect(configSource).toContain(pattern);
      }
    });

    it('should include shared deps source files in buildDependencies', () => {
      expect(configSource).toContain('entry.js');
      expect(configSource).toContain('definitions.js');
    });
  });

  describe('create_external_plugin_config.ts references shared deps', () => {
    let configSource: string;

    beforeAll(() => {
      const configPath = Path.resolve(
        REPO_ROOT,
        'packages/kbn-rspack-optimizer/src/config/create_external_plugin_config.ts'
      );
      configSource = Fs.readFileSync(configPath, 'utf-8');
    });

    it('should have buildDependencies configuration', () => {
      expect(configSource).toContain('buildDependencies');
    });

    it('should include externals.ts in buildDependencies', () => {
      expect(configSource).toContain('externals.ts');
    });

    it('should include shared deps built outputs in buildDependencies', () => {
      for (const pattern of REQUIRED_BUILD_DEPENDENCY_PATTERNS) {
        expect(configSource).toContain(pattern);
      }
    });
  });
});
