/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import { createRequire } from 'module';
import Path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { bundlePluginServerDir } from './bundle_plugin_server';

const req = createRequire(__filename);

describe('bundlePluginServerDir (direct TypeScript via Rspack builtin:swc-loader)', () => {
  let tmpBaseDir: string;

  beforeEach(async () => {
    const targetDir = Path.join(REPO_ROOT, 'target');
    await fs.promises.mkdir(targetDir, { recursive: true });
    tmpBaseDir = await fs.promises.mkdtemp(Path.join(targetDir, 'kbn-bundle-server-ts-test-'));
  });

  afterEach(async () => {
    await fs.promises.rm(tmpBaseDir, { recursive: true, force: true });
  });

  it('compiles .ts sources directly into distServerDir, preserves __dirname/__filename, splits lazy imports, and emits .ts source maps', async () => {
    const srcServerDir = Path.join(tmpBaseDir, 'src', 'server');
    const distServerDir = Path.join(tmpBaseDir, 'dist', 'server');
    await fs.promises.mkdir(Path.join(srcServerDir, 'routes', 'nested'), { recursive: true });
    await fs.promises.mkdir(Path.join(tmpBaseDir, 'dist', 'common'), { recursive: true });

    await fs.promises.writeFile(
      Path.join(tmpBaseDir, 'dist', 'common', 'index.js'),
      `"use strict";\nexports.COMMON_ID = "from-common";\n`,
      'utf8'
    );

    await fs.promises.writeFile(
      Path.join(srcServerDir, 'index.ts'),
      `import { Plugin } from './plugin';\nexport const plugin = () => new Plugin();\n`,
      'utf8'
    );

    await fs.promises.writeFile(
      Path.join(srcServerDir, 'plugin.ts'),
      [
        `import { getRouteInfo } from './routes/nested/route';`,
        `const { COMMON_ID } = require('../common');`,
        `export class Plugin {`,
        `  setup() {`,
        `    return { common: COMMON_ID, route: getRouteInfo() };`,
        `  }`,
        `  async loadLazy() {`,
        `    const { LAZY_VALUE } = await import('./routes/lazy_oas');`,
        `    return LAZY_VALUE;`,
        `  }`,
        `}`,
      ].join('\n'),
      'utf8'
    );

    await fs.promises.writeFile(
      Path.join(srcServerDir, 'routes', 'nested', 'route.ts'),
      [
        `import Path from 'path';`,
        `export interface RouteInfo { dir: string; file: string; asset: string }`,
        `export function getRouteInfo(): RouteInfo {`,
        `  const asset = require('./schema.json');`,
        `  return {`,
        `    dir: __dirname,`,
        `    file: __filename,`,
        `    asset: Path.join(__dirname, 'schema.json') + ':' + asset.ok,`,
        `  };`,
        `}`,
      ].join('\n'),
      'utf8'
    );

    await fs.promises.writeFile(
      Path.join(srcServerDir, 'routes', 'lazy_oas.ts'),
      `export const LAZY_VALUE: string = 'lazy-oas-payload';\n`,
      'utf8'
    );

    // Non-TS asset copied to distServerDir by BuildPackages
    await fs.promises.mkdir(Path.join(distServerDir, 'routes', 'nested'), { recursive: true });
    await fs.promises.writeFile(
      Path.join(distServerDir, 'routes', 'nested', 'schema.json'),
      JSON.stringify({ ok: 'yes' }),
      'utf8'
    );

    const result = await bundlePluginServerDir({
      srcServerDir,
      distServerDir,
      sourceMaps: true,
    });

    expect(result.bundled).toBe(true);
    expect(result.sourceFilesCount).toBe(4);
    expect(fs.existsSync(Path.join(distServerDir, 'plugin.js'))).toBe(true);
    expect(fs.existsSync(Path.join(distServerDir, 'plugin.js.map'))).toBe(true);

    // Source maps reference the original .ts files
    const mapFiles = (await fs.promises.readdir(distServerDir)).filter((f) =>
      f.endsWith('.js.map')
    );
    const allMappedSources = mapFiles.flatMap(
      (f) => JSON.parse(fs.readFileSync(Path.join(distServerDir, f), 'utf8')).sources as string[]
    );
    expect(allMappedSources.some((s) => s.endsWith('plugin.ts'))).toBe(true);
    expect(allMappedSources.some((s) => s.endsWith('routes/nested/route.ts'))).toBe(true);

    const loadedIndex = req(Path.join(distServerDir, 'index.js'));
    const instance = loadedIndex.plugin();
    const setupRes = instance.setup();

    expect(setupRes.common).toBe('from-common');
    expect(setupRes.route.dir).toBe(Path.join(distServerDir, 'routes', 'nested'));
    expect(setupRes.route.file).toBe(Path.join(distServerDir, 'routes', 'nested', 'route.js'));
    expect(setupRes.route.asset).toBe(
      `${Path.join(distServerDir, 'routes', 'nested', 'schema.json')}:yes`
    );
    expect(await instance.loadLazy()).toBe('lazy-oas-payload');
  });

  it('shares singleton state between plugin.ts and additional deep entries', async () => {
    const srcServerDir = Path.join(tmpBaseDir, 'src', 'server');
    const distServerDir = Path.join(tmpBaseDir, 'dist', 'server');
    await fs.promises.mkdir(Path.join(srcServerDir, 'services'), { recursive: true });

    await fs.promises.writeFile(
      Path.join(srcServerDir, 'index.ts'),
      `export { Plugin } from './plugin';\n`,
      'utf8'
    );
    await fs.promises.writeFile(
      Path.join(srcServerDir, 'plugin.ts'),
      `import { counter } from './services/state';\nexport const Plugin = () => counter.inc();\n`,
      'utf8'
    );
    await fs.promises.writeFile(
      Path.join(srcServerDir, 'services', 'state.ts'),
      `let count = 0;\nexport const counter = { inc: () => ++count };\n`,
      'utf8'
    );

    const res = await bundlePluginServerDir({
      srcServerDir,
      distServerDir,
      additionalEntries: ['services/state'],
      sourceMaps: false,
    });

    expect(res.bundled).toBe(true);
    expect(fs.existsSync(Path.join(distServerDir, 'services', 'state.js'))).toBe(true);

    const mainExport = req(Path.join(distServerDir, 'index.js'));
    const deepExport = req(Path.join(distServerDir, 'services', 'state.js'));

    expect(mainExport.Plugin()).toBe(1);
    expect(deepExport.counter.inc()).toBe(2);
  });
});
