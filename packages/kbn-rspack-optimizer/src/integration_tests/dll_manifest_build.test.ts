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
import * as UiSharedDepsSrc from '@kbn/ui-shared-deps-src';

import { resolveSharedAssetPaths } from '../config/shared_asset_paths';
import { COMPILE_RESULT_FILENAME, type CompileWorkerResult } from './compile_worker';
import { SHARED_BUILD_RESULT_FILENAME, type SharedBuildWorkerResult } from './shared_build_worker';

const SHARED_BUILD_WORKER_PATH = Path.resolve(__dirname, 'shared_build_worker.ts');
const COMPILE_WORKER_PATH = Path.resolve(__dirname, 'compile_worker.ts');

const DLL_ONLY_MODULES = [
  './node_modules/@babel/runtime/helpers/esm/assertThisInitialized.js',
  './node_modules/@babel/runtime/helpers/esm/classPrivateFieldGet.js',
  './node_modules/@babel/runtime/helpers/esm/inheritsLoose.js',
  './node_modules/core-js/stable/index.js',
  './node_modules/qs/lib/index.js',
];

interface DllManifest {
  name: string;
  content: Record<string, { id: number }>;
}

function runNodeScript(scriptPath: string, payload: unknown): void {
  execFileSync(
    process.execPath,
    ['-r', '@kbn/swc-register/install', scriptPath, JSON.stringify(payload)],
    { encoding: 'utf-8', timeout: 540_000, maxBuffer: 32 * 1024 * 1024 }
  );
}

function readJson<T>(filePath: string): T {
  return JSON.parse(Fs.readFileSync(filePath, 'utf8')) as T;
}

describe('generated shared DLL', () => {
  let outputRoot: string;
  let manifestPath: string;
  let manifest: DllManifest;

  beforeAll(() => {
    const tmpRoot = Path.join(REPO_ROOT, 'target', 'kbn-rspack-integration');
    Fs.mkdirSync(tmpRoot, { recursive: true });
    outputRoot = Fs.mkdtempSync(Path.join(tmpRoot, 'shared-'));
    manifestPath = resolveSharedAssetPaths(REPO_ROOT, outputRoot).npmManifest;

    try {
      runNodeScript(SHARED_BUILD_WORKER_PATH, { repoRoot: REPO_ROOT, outputRoot });
    } catch (error) {
      const resultPath = Path.join(outputRoot, SHARED_BUILD_RESULT_FILENAME);
      if (Fs.existsSync(resultPath)) {
        const result = readJson<SharedBuildWorkerResult>(resultPath);
        throw new Error(`Shared bundle build failed:\n${result.errors.join('\n')}`, {
          cause: error,
        });
      }
      throw error;
    }

    const result = readJson<SharedBuildWorkerResult>(
      Path.join(outputRoot, SHARED_BUILD_RESULT_FILENAME)
    );
    if (!result.success) {
      throw new Error(`Shared bundle build failed:\n${result.errors.join('\n')}`);
    }

    manifest = readJson<DllManifest>(manifestPath);
  }, 600_000);

  afterAll(() => {
    if (outputRoot) {
      Fs.rmSync(outputRoot, { recursive: true, force: true });
    }
  });

  it('records the shared npm modules in the DLL manifest', () => {
    expect(manifest.name).toBe('__kbnSharedDeps_npm__');
    expect(Object.keys(manifest.content).length).toBeGreaterThan(1000);

    for (const modulePath of DLL_ONLY_MODULES) {
      expect(manifest.content[modulePath]).toBeDefined();
    }

    const dllModulePaths = Object.keys(manifest.content);
    expect(dllModulePaths.some((modulePath) => modulePath.includes('node_modules/react/'))).toBe(
      true
    );
    expect(dllModulePaths.some((modulePath) => modulePath.includes('node_modules/lodash/'))).toBe(
      true
    );
    expect(dllModulePaths.some((modulePath) => modulePath.includes('node_modules/rxjs/'))).toBe(
      true
    );
  });

  it('keeps src externals on __kbnSharedDeps__ and the DLL on __kbnSharedDeps_npm__', () => {
    const sharedDepsExternals = UiSharedDepsSrc.externals as Record<string, string>;

    for (const value of Object.values(sharedDepsExternals)) {
      expect(value).toContain('__kbnSharedDeps__');
      expect(value).not.toContain('__kbnSharedDeps_npm__');
    }

    expect(sharedDepsExternals.react).toBeDefined();
    expect(sharedDepsExternals.lodash).toBeDefined();
    expect(sharedDepsExternals.rxjs).toBeDefined();
  });

  it('externalizes a DLL-only plugin import to the generated manifest module', () => {
    const pluginId = 'dllFixturePlugin';
    const pluginDir = Path.join(outputRoot, 'dll_fixture_plugin');
    const compileDir = Path.join(outputRoot, 'dll-fixture-output');
    const qsModule = manifest.content['./node_modules/qs/lib/index.js'];

    Fs.mkdirSync(Path.join(pluginDir, 'public'), { recursive: true });
    Fs.writeFileSync(
      Path.join(pluginDir, 'kibana.jsonc'),
      JSON.stringify({
        type: 'plugin',
        id: '@kbn/dll-fixture-plugin',
        owner: { name: 'test', githubTeam: 'test' },
        plugin: { id: pluginId, browser: true },
      })
    );
    Fs.writeFileSync(
      Path.join(pluginDir, 'public', 'index.ts'),
      [
        `import qs from 'qs';`,
        `export const plugin = () => ({ setup: () => qs.parse('a=b'), start: () => {} });`,
      ].join('\n') + '\n'
    );

    runNodeScript(COMPILE_WORKER_PATH, {
      repoRoot: REPO_ROOT,
      pluginDir,
      pluginId,
      outputDir: compileDir,
      dist: false,
      dllManifestPath: manifestPath,
    });

    const result = readJson<CompileWorkerResult>(Path.join(compileDir, COMPILE_RESULT_FILENAME));
    expect(result.errors).toEqual([]);
    expect(result.success).toBe(true);

    const bundleContent = Fs.readFileSync(Path.join(compileDir, `${pluginId}.plugin.js`), 'utf8');
    expect(bundleContent).toContain(
      `(__webpack_require__("dll-reference __kbnSharedDeps_npm__"))(${qsModule.id})`
    );
    expect(bundleContent).not.toContain('function stringify');
  }, 120_000);
});
