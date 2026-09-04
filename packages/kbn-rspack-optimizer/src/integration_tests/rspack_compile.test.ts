/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import Fs from 'fs';
import { execFileSync } from 'child_process';

import { REPO_ROOT } from '@kbn/repo-info';

import {
  createSingleCompileConfig,
  type SingleCompileConfigOptions,
} from '../config/create_single_compile_config';
import { COMPILE_RESULT_FILENAME, type CompileWorkerResult } from './compile_worker';

/**
 * Real compilations run in a forked plain-Node worker process. Under Jest,
 * the natively-loaded (pure ESM) @rspack/core lives in a different vm realm
 * than the test file, so Rspack's `instanceof RegExp` config normalization
 * fails on the Jest-realm RegExp conditions in our module rules and silently
 * miscompiles (see compile_worker.ts). Keeping the compile in a plain Node
 * process preserves production-realistic module semantics.
 */
const COMPILE_WORKER_PATH = Path.resolve(__dirname, 'compile_worker.ts');

function compileInWorker(options: {
  pluginDir: string;
  pluginId: string;
  outputDir: string;
  dist: boolean;
}): CompileWorkerResult {
  try {
    execFileSync(
      process.execPath,
      [
        '-r',
        '@kbn/swc-register/install',
        COMPILE_WORKER_PATH,
        JSON.stringify({ repoRoot: REPO_ROOT, ...options }),
      ],
      { encoding: 'utf-8', timeout: 110_000, maxBuffer: 32 * 1024 * 1024 }
    );
  } catch (e) {
    // The worker exits non-zero only on unexpected harness failures. If it
    // still wrote the result file, prefer it — it carries the real error.
    if (!Fs.existsSync(Path.join(options.outputDir, COMPILE_RESULT_FILENAME))) {
      throw e;
    }
  }

  const resultPath = Path.join(options.outputDir, COMPILE_RESULT_FILENAME);
  return JSON.parse(Fs.readFileSync(resultPath, 'utf-8'));
}

/**
 * Create a minimal fixture plugin inside a temporary directory.
 * The plugin has a `kibana.jsonc` manifest and a `public/index.ts` entry.
 */
function createFixturePlugin(tmpDir: string): { pluginDir: string; pluginId: string } {
  const pluginId = 'testFixturePlugin';
  const pluginDir = Path.join(tmpDir, 'test_fixture_plugin');

  Fs.mkdirSync(Path.join(pluginDir, 'public'), { recursive: true });

  Fs.writeFileSync(
    Path.join(pluginDir, 'kibana.jsonc'),
    JSON.stringify({
      type: 'plugin',
      id: '@kbn/test-fixture-plugin',
      owner: { name: 'test', githubTeam: 'test' },
      plugin: {
        id: pluginId,
        browser: true,
      },
    })
  );

  Fs.writeFileSync(
    Path.join(pluginDir, 'public', 'index.ts'),
    [
      `export const plugin = () => ({ setup: () => {}, start: () => {} });`,
      `export const MY_CONSTANT = 42;`,
      `export const SomeComponent = () => 'hello';`,
    ].join('\n') + '\n'
  );

  return { pluginDir, pluginId };
}

function createEmotionFixturePlugin(tmpDir: string): { pluginDir: string; pluginId: string } {
  const pluginId = 'emotionFixturePlugin';
  const pluginDir = Path.join(tmpDir, 'emotion_fixture_plugin');

  Fs.mkdirSync(Path.join(pluginDir, 'public'), { recursive: true });

  Fs.writeFileSync(
    Path.join(pluginDir, 'kibana.jsonc'),
    JSON.stringify({
      type: 'plugin',
      id: '@kbn/emotion-fixture-plugin',
      owner: { name: 'test', githubTeam: 'test' },
      plugin: {
        id: pluginId,
        browser: true,
      },
    })
  );

  Fs.writeFileSync(
    Path.join(pluginDir, 'public', 'index.ts'),
    [
      `import styled from '@emotion/styled';`,
      ``,
      'const Parent = styled.div`color: red;`;',
      'export const Child = styled.div`${Parent}:hover & { color: blue; }`;',
      `export const plugin = () => ({ setup: () => {}, start: () => {} });`,
    ].join('\n') + '\n'
  );

  return { pluginDir, pluginId };
}

describe('rspack compile integration', () => {
  describe('createSingleCompileConfig', () => {
    it('produces a valid rspack config with entry, output, plugins, and module rules', async () => {
      const options: SingleCompileConfigOptions = {
        repoRoot: REPO_ROOT,
        dist: false,
        watch: false,
        cache: false,
        examples: false,
        testPlugins: false,
      };

      const config = await createSingleCompileConfig(options);

      expect(config.name).toBe('kibana');
      expect(config.mode).toBe('development');
      expect(config.entry).toBeDefined();
      expect((config.entry as Record<string, unknown>).kibana).toBeDefined();

      expect(config.output).toBeDefined();
      expect(config.output!.path).toContain('target/public/bundles');
      expect(config.output!.filename).toBe('[name].bundle.js');

      expect(config.module).toBeDefined();
      expect(config.module!.rules).toBeDefined();
      expect(Array.isArray(config.module!.rules)).toBe(true);
      expect(config.module!.rules!.length).toBeGreaterThan(0);

      expect(config.plugins).toBeDefined();
      expect(Array.isArray(config.plugins)).toBe(true);
      expect(config.plugins!.length).toBeGreaterThan(0);

      expect(config.resolve).toBeDefined();
      expect(config.resolve!.fallback).toBeDefined();

      expect(config.optimization).toBeDefined();
      expect(config.optimization!.splitChunks).toBeDefined();
    });

    it('sets production mode and minimizer when dist is true', async () => {
      const config = await createSingleCompileConfig({
        repoRoot: REPO_ROOT,
        dist: true,
        watch: false,
        cache: false,
        examples: false,
        testPlugins: false,
      });

      expect(config.mode).toBe('production');
      expect(config.devtool).toBe(false);
      expect(config.optimization!.minimize).toBe(true);
      expect(config.optimization!.minimizer).toBeDefined();
      expect(config.optimization!.minimizer!.length).toBeGreaterThan(0);
    });
  });

  describe('createExternalPluginConfig + compile', () => {
    let tmpDir: string;

    beforeEach(() => {
      const tmpRoot = Path.join(REPO_ROOT, 'target', 'kbn-rspack-integration');
      Fs.mkdirSync(tmpRoot, { recursive: true });
      tmpDir = Fs.mkdtempSync(Path.join(tmpRoot, 'test-'));
    });

    afterEach(() => {
      Fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('compiles a minimal fixture plugin and emits output bundle', () => {
      const { pluginDir, pluginId } = createFixturePlugin(tmpDir);
      const outputDir = Path.join(tmpDir, 'output');

      const result = compileInWorker({ pluginDir, pluginId, outputDir, dist: false });

      expect(result.errors).toEqual([]);
      expect(result.success).toBe(true);

      const outputFiles = Fs.readdirSync(outputDir).filter(
        (f) => !f.startsWith('.') && f.endsWith('.js')
      );
      expect(outputFiles.length).toBeGreaterThanOrEqual(1);

      const mainBundle = outputFiles.find((f) => f.includes(pluginId));
      expect(mainBundle).toBeDefined();

      const bundleContent = Fs.readFileSync(Path.join(outputDir, mainBundle!), 'utf-8');
      expect(bundleContent.length).toBeGreaterThan(0);

      // Verify plugin exports are preserved (regression guard for export preservation).
      // All named exports must survive bundling because external plugins consume them
      // at runtime via __kbnBundles__.get().
      expect(bundleContent).toContain('__kbnBundles__');
      expect(bundleContent).toContain(`plugin/${pluginId}`);
      expect(bundleContent).toMatch(/plugin/);
      expect(bundleContent).toMatch(/MY_CONSTANT/);
      expect(bundleContent).toMatch(/SomeComponent/);
    }, 120_000);

    it.each([
      { dist: false, mode: 'development' },
      { dist: true, mode: 'production' },
    ])(
      'compiles Emotion component selectors with injected targets in $mode mode',
      ({ dist }) => {
        const { pluginDir, pluginId } = createEmotionFixturePlugin(tmpDir);
        const outputDir = Path.join(tmpDir, dist ? 'output-emotion-dist' : 'output-emotion-dev');

        const result = compileInWorker({ pluginDir, pluginId, outputDir, dist });

        if (!result.success) {
          throw new Error(JSON.stringify(result.errors, null, 2));
        }

        const mainBundle = Fs.readdirSync(outputDir).find(
          (f) => f.includes(pluginId) && f.endsWith('.js')
        );
        expect(mainBundle).toBeDefined();

        const bundleContent = Fs.readFileSync(Path.join(outputDir, mainBundle!), 'utf-8');
        const emotionTargets = bundleContent.match(/target:\s*"e[a-z0-9]+"/g) ?? [];
        expect(emotionTargets).toHaveLength(2);
        if (dist) {
          expect(bundleContent).not.toContain('const Parent');
        }
      },
      120_000
    );

    it('compiles a fixture plugin in production mode with minification', () => {
      const { pluginDir, pluginId } = createFixturePlugin(tmpDir);
      const outputDir = Path.join(tmpDir, 'output-dist');

      const result = compileInWorker({ pluginDir, pluginId, outputDir, dist: true });

      expect(result.errors).toEqual([]);
      expect(result.success).toBe(true);

      const mainBundle = Fs.readdirSync(outputDir).find(
        (f) => f.includes(pluginId) && f.endsWith('.js')
      );
      expect(mainBundle).toBeDefined();

      const devResult = compileInWorker({
        pluginDir,
        pluginId,
        outputDir: Path.join(tmpDir, 'output-dev'),
        dist: false,
      });
      expect(devResult.errors).toEqual([]);
      expect(devResult.success).toBe(true);

      // Verify export names survive minification -- they appear as string keys
      // in Rspack's __webpack_exports__ define call (e.g. b.d(D, { MY_CONSTANT: ... }))
      const distContent = Fs.readFileSync(Path.join(outputDir, mainBundle!), 'utf-8');
      expect(distContent).toContain('__kbnBundles__');
      expect(distContent).toMatch(/plugin/);
      expect(distContent).toMatch(/MY_CONSTANT/);
      expect(distContent).toMatch(/SomeComponent/);

      const distSize = Fs.statSync(Path.join(outputDir, mainBundle!)).size;
      const devBundle = Fs.readdirSync(Path.join(tmpDir, 'output-dev')).find(
        (f) => f.includes(pluginId) && f.endsWith('.js')
      );
      expect(devBundle).toBeDefined();
      const devSize = Fs.statSync(Path.join(tmpDir, 'output-dev', devBundle!)).size;

      expect(distSize).toBeLessThan(devSize);
    }, 120_000);
  });
});
