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
    const resolveConfig = getSharedResolveConfig(REPO_ROOT);

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
      expect(resolveConfig.alias?.['react-dom$']).toBe('react-dom/profiling');
    });

    it('should have scheduler/tracing alias', () => {
      expect(resolveConfig.alias?.['scheduler/tracing']).toBe('scheduler/tracing-profiling');
    });

    it('should reference tsconfig.base.json', () => {
      expect(resolveConfig.tsConfig).toBe(Path.resolve(REPO_ROOT, 'tsconfig.base.json'));
    });
  });

  describe('getSharedResolveFallback', () => {
    const fallback = getSharedResolveFallback();

    it('should disable Node.js built-ins for browser', () => {
      expect(fallback.child_process).toBe(false);
      expect(fallback.net).toBe(false);
      expect(fallback.tls).toBe(false);
      expect(fallback.dns).toBe(false);
    });

    it('should disable node: prefixed modules', () => {
      expect(fallback['node:child_process']).toBe(false);
      expect(fallback['node:net']).toBe(false);
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
      const imageRule = rules.find((r) =>
        r.test?.toString().includes('png') || r.test?.toString().includes('svg')
      );
      expect(imageRule).toBeDefined();
    });

    it('should include font loader rule', () => {
      const fontRule = rules.find((r) =>
        r.test?.toString().includes('woff') || r.test?.toString().includes('ttf')
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
