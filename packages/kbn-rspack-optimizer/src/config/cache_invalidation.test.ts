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
 * Both configs use a CACHE_CONFIG_FILES constant as the single source of truth
 * for computeConfigHash and buildDependencies.
 * These tests verify the source files listed there exist and are referenced.
 */
describe('RSPack cache invalidation configuration', () => {
  const SHARED_PATTERNS = [
    'shared_config.ts',
    'externals.ts',
    'theme_loader.ts',
    'require_interop_loader.ts',
    'kbn-swc-config/src/browser.ts',
    'kbn-transpiler-config/src/shared_config.ts',
    'package.json',
  ];

  describe('required source files exist', () => {
    const REQUIRED_SOURCE_FILES = [
      'packages/kbn-rspack-optimizer/src/config/externals.ts',
      'packages/kbn-rspack-optimizer/src/config/shared_config.ts',
      'packages/kbn-rspack-optimizer/src/config/create_single_compile_config.ts',
      'packages/kbn-rspack-optimizer/src/config/create_external_plugin_config.ts',
      'packages/kbn-rspack-optimizer/src/loaders/theme_loader.ts',
      'packages/kbn-rspack-optimizer/src/loaders/require_interop_loader.ts',
      'packages/kbn-rspack-optimizer/src/loaders/hmr_boundary_loader.ts',
      'packages/kbn-rspack-optimizer/src/plugins/chunk_preload_manifest_plugin.ts',
      'packages/kbn-swc-config/src/browser.ts',
      'packages/kbn-transpiler-config/src/shared_config.ts',
    ];

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

    it('should have CACHE_CONFIG_FILES constant', () => {
      expect(configSource).toContain('CACHE_CONFIG_FILES');
    });

    it('should have buildDependencies driven by CACHE_CONFIG_FILES', () => {
      expect(configSource).toContain('buildDependencies');
    });

    for (const pattern of SHARED_PATTERNS) {
      it(`should reference ${pattern}`, () => {
        expect(configSource).toContain(pattern);
      });
    }

    it('should reference its own config file', () => {
      expect(configSource).toContain('create_single_compile_config.ts');
    });

    it('should reference hmr_boundary_loader', () => {
      expect(configSource).toContain('hmr_boundary_loader');
    });

    it('should reference chunk_preload_manifest_plugin', () => {
      expect(configSource).toContain('chunk_preload_manifest_plugin');
    });
  });

  describe('create_external_plugin_config.ts references required files', () => {
    let configSource: string;

    beforeAll(() => {
      const configPath = Path.resolve(
        REPO_ROOT,
        'packages/kbn-rspack-optimizer/src/config/create_external_plugin_config.ts'
      );
      configSource = Fs.readFileSync(configPath, 'utf-8');
    });

    it('should have CACHE_CONFIG_FILES constant', () => {
      expect(configSource).toContain('CACHE_CONFIG_FILES');
    });

    it('should have buildDependencies driven by CACHE_CONFIG_FILES', () => {
      expect(configSource).toContain('buildDependencies');
    });

    for (const pattern of SHARED_PATTERNS) {
      it(`should reference ${pattern}`, () => {
        expect(configSource).toContain(pattern);
      });
    }

    it('should reference its own config file', () => {
      expect(configSource).toContain('create_external_plugin_config.ts');
    });

    it('should use computeConfigHash from shared_config', () => {
      expect(configSource).toContain('computeConfigHash');
    });
  });
});
