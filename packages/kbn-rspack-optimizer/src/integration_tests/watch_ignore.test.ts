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
import { EventEmitter, once } from 'events';
import { setTimeout as delay } from 'timers/promises';
import type { Compiler, Stats } from '@rspack/core';

jest.mock('../config/create_multi_compile_config', () => ({
  ...jest.requireActual('../config/create_multi_compile_config'),
  createMultiCompileConfig: jest.fn(),
}));

import { createMultiCompileConfig, KIBANA_COMPILER } from '../config/create_multi_compile_config';
import { runBuild } from '../run_build';

describe('Rspack watch ignores', () => {
  it.each(['scout', 'scout_custom'])(
    'ignores changes under test/%s while rebuilding browser source and manifests',
    async (scoutDir) => {
      const repoRoot = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'rspack-watch-ignore-'));
      const pluginDir = Path.join(repoRoot, 'plugin');
      const fixturesDir = Path.join(pluginDir, 'test', scoutDir, 'ui', 'fixtures');
      const fixture = Path.join(fixturesDir, 'index.ts');
      const entry = Path.join(pluginDir, 'public', 'index.js');
      const manifest = Path.join(pluginDir, 'kibana.jsonc');
      const outputDir = Path.join(repoRoot, 'output');

      Fs.mkdirSync(fixturesDir, { recursive: true });
      Fs.mkdirSync(Path.dirname(entry), { recursive: true });
      Fs.mkdirSync(outputDir);
      Fs.writeFileSync(fixture, 'export const fixture = 1;');
      Fs.writeFileSync(entry, 'console.log("initial");');
      Fs.writeFileSync(manifest, '{}');

      const events = new EventEmitter();
      const builds: Stats[] = [];
      const invalidations: Array<string | null> = [];
      let compiler: Compiler | undefined;
      jest.mocked(createMultiCompileConfig).mockResolvedValue({
        bundleCount: 1,
        configs: [
          {
            name: KIBANA_COMPILER,
            mode: 'development',
            context: pluginDir,
            entry,
            cache: false,
            output: { path: outputDir },
            plugins: [
              {
                apply(watchCompiler: Compiler) {
                  compiler = watchCompiler;
                  watchCompiler.hooks.invalid.tap('WatchIgnoreTest', (file) => {
                    invalidations.push(file);
                  });
                  watchCompiler.hooks.afterCompile.tap('WatchIgnoreTest', (compilation) => {
                    // PluginWatchPlugin watches the entire plugin directory for manifest changes.
                    compilation.contextDependencies.add(pluginDir);
                  });
                  watchCompiler.hooks.done.tap('WatchIgnoreTest', (stats) => {
                    builds.push(stats);
                    events.emit('build');
                  });
                },
              },
            ],
          },
        ],
      });

      const result = await runBuild({ repoRoot, watch: true, hmr: false });
      try {
        expect(result.success).toBe(true);
        // Newly created fixtures can trigger a timestamp reconciliation build during watch setup.
        await delay(500);
        const initialBuildCount = builds.length;
        invalidations.length = 0;

        Fs.appendFileSync(fixture, '\n// fixture edit');
        await delay(500);
        expect(invalidations).toEqual([]);
        expect(builds).toHaveLength(initialBuildCount);

        const addedDir = Path.join(fixturesDir, 'data');
        Fs.mkdirSync(addedDir);
        Fs.writeFileSync(Path.join(addedDir, 'sample.json'), '{}');
        await delay(500);
        expect(invalidations).toEqual([]);
        expect(builds).toHaveLength(initialBuildCount);

        Fs.rmSync(addedDir, { recursive: true });
        Fs.unlinkSync(fixture);
        await delay(500);
        expect(invalidations).toEqual([]);
        expect(builds).toHaveLength(initialBuildCount);

        for (const file of [entry, manifest]) {
          const buildCount = builds.length;
          const rebuilt = once(events, 'build', { signal: AbortSignal.timeout(10_000) });
          Fs.appendFileSync(file, '\n// source edit');
          await rebuilt;
          expect(builds).toHaveLength(buildCount + 1);
        }
        expect(builds.every((stats) => !stats.hasErrors())).toBe(true);
      } finally {
        await result.close?.();
        await result.done;
        if (compiler) {
          const watchCompiler = compiler;
          await new Promise<void>((resolve, reject) => {
            watchCompiler.close((error) => (error ? reject(error) : resolve()));
          });
        }
        Fs.rmSync(repoRoot, { recursive: true, force: true });
      }
    },
    30_000
  );
});
