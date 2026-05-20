/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ThemeTag } from '../types';
import {
  getSharedResolveConfig,
  getSharedResolveFallback,
  getSwcLoaderRules,
  getBabelLoaderRule,
  getSharedModuleRules,
  getSharedIgnoreWarnings,
} from './shared_config';

describe('shared_config', () => {
  describe('getSharedResolveConfig', () => {
    const resolveConfig = getSharedResolveConfig(REPO_ROOT)!;

    it('should include TypeScript extensions', () => {
      expect(resolveConfig.extensions).toContain('.ts');
      expect(resolveConfig.extensions).toContain('.tsx');
    });

    it('should include JavaScript and JSON extensions', () => {
      expect(resolveConfig.extensions).toContain('.js');
      expect(resolveConfig.extensions).toContain('.json');
    });

    it('should match legacy webpack optimizer extensions', () => {
      // Must match packages/kbn-optimizer/src/worker/webpack.config.ts
      expect(resolveConfig.extensions).toEqual(['.js', '.ts', '.tsx', '.json']);
    });

    it('should match legacy webpack optimizer mainFields', () => {
      // Must match packages/kbn-optimizer/src/worker/webpack.config.ts
      expect(resolveConfig.mainFields).toEqual(['browser', 'module', 'main']);
    });

    it('should NOT define conditionNames (match legacy optimizer)', () => {
      // Legacy optimizer doesn't define conditionNames - let bundler use defaults
      expect(resolveConfig.conditionNames).toBeUndefined();
    });

    it('should have react-dom profiling alias', () => {
      expect((resolveConfig.alias as Record<string, unknown>)?.['react-dom$']).toBe(
        'react-dom/profiling'
      );
    });

    it('should have scheduler/tracing alias', () => {
      expect((resolveConfig.alias as Record<string, unknown>)?.['scheduler/tracing']).toBe(
        'scheduler/tracing-profiling'
      );
    });

    it('should alias buffer to node-stdlib-browser and package resolve paths', () => {
      const alias = resolveConfig.alias as Record<string, string[]>;
      expect(alias.buffer).toEqual([
        Path.resolve(REPO_ROOT, 'node_modules/node-stdlib-browser/node_modules/buffer'),
        require.resolve('buffer'),
      ]);
    });

    it('should alias punycode to node-stdlib-browser and package resolve paths', () => {
      const alias = resolveConfig.alias as Record<string, string[]>;
      expect(alias.punycode).toEqual([
        Path.resolve(REPO_ROOT, 'node_modules/node-stdlib-browser/node_modules/punycode'),
        require.resolve('punycode'),
      ]);
    });

    it('should reference tsconfig.base.json', () => {
      expect(resolveConfig.tsConfig).toBe(Path.resolve(REPO_ROOT, 'tsconfig.base.json'));
    });
  });

  describe('getSharedResolveFallback', () => {
    /** Must stay in sync with `getSharedResolveFallback` in shared_config.ts */
    const EXPECTED_NODE_FALLBACK_KEYS = [
      'node:fs',
      'node:path',
      'node:os',
      'node:crypto',
      'node:stream',
      'node:buffer',
      'node:util',
      'node:url',
      'node:http',
      'node:https',
      'node:events',
      'node:process',
      'node:querystring',
      'node:assert',
      'node:zlib',
      'node:vm',
      'node:tty',
      'node:child_process',
      'node:net',
      'node:tls',
      'node:dns',
    ] as const;

    it('should cover the full set of node:* stubs with false fallbacks', () => {
      const fallback = getSharedResolveFallback();
      for (const key of EXPECTED_NODE_FALLBACK_KEYS) {
        expect(fallback[key]).toBe(false);
      }
      expect(Object.keys(fallback).sort()).toEqual([...EXPECTED_NODE_FALLBACK_KEYS].sort());
    });

    it('should disable node:-prefixed modules for browser', () => {
      const fallback = getSharedResolveFallback();
      expect(fallback['node:child_process']).toBe(false);
      expect(fallback['node:net']).toBe(false);
      expect(fallback['node:tls']).toBe(false);
      expect(fallback['node:dns']).toBe(false);
    });
  });

  describe('getSwcLoaderRules', () => {
    describe('development mode', () => {
      const rules = getSwcLoaderRules(false);
      const tsRule = rules[0]; // TypeScript rule
      const jsRule = rules[1]; // JavaScript rule

      it('should return two rules (TS and JS)', () => {
        expect(rules).toHaveLength(2);
        expect(tsRule.test).toEqual(/\.tsx?$/);
        expect(jsRule.test).toEqual(/\.jsx?$/);
      });

      it('should exclude node_modules', () => {
        expect(tsRule.exclude).toEqual(/node_modules/);
        expect(jsRule.exclude).toEqual(/node_modules/);
      });

      it('should use builtin:swc-loader for TypeScript', () => {
        expect(tsRule.loader).toBe('builtin:swc-loader');
      });

      it('should use loader chain with require_interop_loader for JavaScript', () => {
        const loaders = jsRule.use as any[];
        expect(loaders).toHaveLength(2);
        // First loader (runs last) is SWC
        expect(loaders[0].loader).toBe('builtin:swc-loader');
        // Second loader (runs first) is require_interop_loader
        expect(loaders[1].loader).toContain('require_interop_loader');
      });

      it('should configure TypeScript parser with TSX and decorators', () => {
        const options = tsRule.options as any;
        expect(options.jsc.parser.syntax).toBe('typescript');
        expect(options.jsc.parser.tsx).toBe(true);
        expect(options.jsc.parser.decorators).toBe(true);
      });

      it('should use Emotion JSX runtime (importSource)', () => {
        const options = tsRule.options as any;
        expect(options.jsc.transform.react.runtime).toBe('automatic');
        expect(options.jsc.transform.react.importSource).toBe('@emotion/react');
      });

      it('should enable development mode for React', () => {
        const options = tsRule.options as any;
        expect(options.jsc.transform.react.development).toBe(true);
      });

      it('should enable source maps in development', () => {
        const options = tsRule.options as any;
        expect(options.sourceMaps).toBe(true);
      });
    });

    describe('production mode', () => {
      const rules = getSwcLoaderRules(true);
      const tsRule = rules[0];

      it('should disable development mode for React', () => {
        const options = tsRule.options as any;
        expect(options.jsc.transform.react.development).toBe(false);
      });

      it('should disable source maps in production', () => {
        const options = tsRule.options as any;
        expect(options.sourceMaps).toBe(false);
      });
    });
  });

  describe('getBabelLoaderRule', () => {
    const rule = getBabelLoaderRule(false);

    it('should match JS/TS files', () => {
      expect(rule.test).toEqual(/\.[jt]sx?$/);
    });

    it('should exclude node_modules', () => {
      expect(rule.exclude).toEqual(/node_modules/);
    });

    it('should use babel-loader', () => {
      const use = rule.use as any;
      expect(use.loader).toContain('babel-loader');
    });

    it('should use @kbn/babel-preset/webpack_preset', () => {
      const use = rule.use as any;
      expect(use.options.presets[0][0]).toContain('webpack_preset');
    });
  });

  describe('getSharedModuleRules', () => {
    const rules = getSharedModuleRules(REPO_ROOT, false);

    it('should include TypeScript loader rule', () => {
      const tsRule = rules.find((r) => r.test?.toString() === '/\\.tsx?$/');
      expect(tsRule).toBeDefined();
    });

    it('should include JavaScript loader rule', () => {
      const jsRule = rules.find((r) => r.test?.toString() === '/\\.jsx?$/');
      expect(jsRule).toBeDefined();
    });

    it('should include CSS loader rule', () => {
      const cssRule = rules.find((r) => r.test?.toString() === '/\\.css$/');
      expect(cssRule).toBeDefined();
    });

    it('should include SCSS loader rules', () => {
      const scssRules = rules.filter((r) => r.test?.toString().includes('scss'));
      expect(scssRules.length).toBeGreaterThan(0);
    });

    it('should include image loader rule', () => {
      const imageRule = rules.find(
        (r) => r.test?.toString().includes('png') || r.test?.toString().includes('svg')
      );
      expect(imageRule).toBeDefined();
    });

    it('should include font loader rule', () => {
      const fontRule = rules.find(
        (r) => r.test?.toString().includes('woff') || r.test?.toString().includes('ttf')
      );
      expect(fontRule).toBeDefined();
    });

    it('should include peggy loader rule', () => {
      const peggyRule = rules.find((r) => r.test?.toString().includes('peggy'));
      expect(peggyRule).toBeDefined();
    });

    it('should use SWC by default for TypeScript', () => {
      const tsRule = rules.find((r) => r.test?.toString() === '/\\.tsx?$/');
      expect(tsRule?.loader).toBe('builtin:swc-loader');
    });

    it('should use SWC with interop loader for JavaScript', () => {
      const jsRule = rules.find((r) => r.test?.toString() === '/\\.jsx?$/');
      const loaders = jsRule?.use as any[];
      expect(loaders).toBeDefined();
      expect(loaders[0]?.loader).toBe('builtin:swc-loader');
      expect(loaders[1]?.loader).toContain('require_interop_loader');
    });

    it('should use Babel when useBabel=true', () => {
      const rulesWithBabel = getSharedModuleRules(REPO_ROOT, false, undefined, undefined, true);
      const jsRule = rulesWithBabel.find((r) => r.test?.toString().includes('jt'));
      const use = jsRule?.use as any;
      expect(use?.loader).toContain('babel-loader');
    });

    it('should pass non-default themeTags and bundleId to theme_loader options', () => {
      const themeTags: ThemeTag[] = ['borealisdark', 'borealislight'];
      const bundleId = 'custom-bundle';
      const customRules = getSharedModuleRules(REPO_ROOT, false, themeTags, bundleId);
      const scssRule = customRules.find((r) => r.test?.toString() === '/\\.scss$/');
      expect(scssRule?.oneOf).toBeDefined();

      const themeLoaderEntry = (scssRule!.oneOf as any[]).find((entry) => {
        const use = entry.use as { loader?: string }[] | undefined;
        return use?.[0]?.loader?.includes('theme_loader');
      });
      expect(themeLoaderEntry).toBeDefined();
      const themeLoaderOptions = (themeLoaderEntry!.use as { options?: unknown }[])[0].options;
      expect(themeLoaderOptions).toEqual({ bundleId, themeTags });
    });

    it('should build per-theme resourceQuery rules for non-default themeTags order', () => {
      const themeTags: ThemeTag[] = ['borealisdark', 'borealislight'];
      const customRules = getSharedModuleRules(REPO_ROOT, false, themeTags, 'custom-bundle');
      const scssRule = customRules.find((r) => r.test?.toString() === '/\\.scss$/');
      const oneOf = scssRule?.oneOf as any[];

      const themeQueryRules = oneOf!.filter((entry) => entry.resourceQuery !== undefined);
      expect(themeQueryRules).toHaveLength(themeTags.length);
      themeTags.forEach((theme, i) => {
        expect(themeQueryRules[i].resourceQuery).toEqual(new RegExp(`\\?${theme}$`));
      });
    });
  });

  describe('HMR config conditionals', () => {
    describe('SWC refresh option', () => {
      it('sets refresh=true when hmr is enabled', () => {
        const rules = getSwcLoaderRules(false, true);
        const tsRule = rules[0];
        // When hmr is enabled, the TS rule uses a `use` array (hmr_boundary_loader + swc-loader)
        const swcEntry = Array.isArray(tsRule.use)
          ? (tsRule.use as any[]).find((u: any) => u.loader === 'builtin:swc-loader')
          : undefined;
        const options = swcEntry ? swcEntry.options : (tsRule.options as any);
        expect(options.jsc.transform.react.refresh).toBe(true);
      });

      it('sets refresh=false when hmr is disabled', () => {
        const rules = getSwcLoaderRules(false, false);
        const tsRule = rules[0];
        const options = tsRule.options as any;
        expect(options.jsc.transform.react.refresh).toBe(false);
      });

      it('sets refresh=false by default (no hmr arg)', () => {
        const rules = getSwcLoaderRules(false);
        const tsRule = rules[0];
        const options = tsRule.options as any;
        expect(options.jsc.transform.react.refresh).toBe(false);
      });

      it('propagates hmr through getSharedModuleRules', () => {
        const rules = getSharedModuleRules(REPO_ROOT, false, undefined, undefined, false, true);
        const tsRule = rules.find((r) => r.test?.toString() === '/\\.tsx?$/');
        const swcEntry = Array.isArray(tsRule?.use)
          ? (tsRule!.use as any[]).find((u: any) => u.loader === 'builtin:swc-loader')
          : undefined;
        const options = swcEntry ? swcEntry.options : (tsRule?.options as any);
        expect(options.jsc.transform.react.refresh).toBe(true);
      });
    });
  });

  describe('getSharedIgnoreWarnings', () => {
    const warnings = getSharedIgnoreWarnings();

    it('should return an array of warning patterns', () => {
      expect(Array.isArray(warnings)).toBe(true);
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('should include pattern for export not found warnings', () => {
      const hasExportWarning = warnings.some(
        (w) => w instanceof RegExp && w.source.includes('export')
      );
      expect(hasExportWarning).toBe(true);
    });

    it('should include pattern for __dirname/__filename mocking warnings', () => {
      const hasDirnameWarning = warnings.some(
        (w) => w instanceof RegExp && w.source.includes('__dirname')
      );
      const hasFilenameWarning = warnings.some(
        (w) => w instanceof RegExp && w.source.includes('__filename')
      );
      expect(hasDirnameWarning).toBe(true);
      expect(hasFilenameWarning).toBe(true);
    });
  });
});
