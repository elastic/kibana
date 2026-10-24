/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Fsp from 'fs/promises';
import { createRequire } from 'module';
import Path from 'path';
import execa from 'execa';
import { REPO_ROOT } from '@kbn/repo-info';
import { createStackTraceResolver } from '@kbn/setup-node-env/source_maps';
import { bundlePluginServer, findEntries } from './bundle_plugin_server';
import { write } from '../lib';
import { minifyFile } from './minify_packages_task';

const req = createRequire(__filename);

describe('bundlePluginServer', () => {
  let src: string;
  let dist: string;

  // Writes `files` to the source plugin and an empty per-file output for each, like BuildPackages.
  const setup = async (files: Record<string, string>, distOnly: string[] = []) => {
    for (const [rel, content] of Object.entries(files)) {
      await write(Path.join(src, rel), content);
      await write(Path.join(dist, rel.replace(/\.tsx?$/, '.js')), '');
    }
    for (const rel of distOnly) {
      await write(Path.join(dist, rel), rel.endsWith('.json') ? '{"ok":"yes"}' : '');
    }
  };

  beforeEach(async () => {
    await Fsp.mkdir(Path.join(REPO_ROOT, 'target'), { recursive: true });
    const tmp = await Fsp.mkdtemp(Path.join(REPO_ROOT, 'target', 'kbn-bundle-plugin-server-'));
    src = Path.join(tmp, 'src');
    dist = Path.join(tmp, 'dist');
  });

  afterEach(async () => {
    await Fsp.rm(Path.dirname(src), { recursive: true, force: true });
  });

  it('bundles server and common code and keeps per-module paths and entry points', async () => {
    await setup(
      {
        'common/index.ts': `export const registry = new Map();\n`,
        'server/index.ts': [
          `export { Plugin } from './plugin';`,
          `export const rawTag = ((s: TemplateStringsArray) => s.raw[0])\`café —\`;`,
          `export const workerPath = require('path').resolve(__dirname, './routes/lazy.js');`,
          `export const resolvedPath = require.resolve('./routes/lazy');`,
          `export const lazy = () => import('./routes/lazy');`,
          `export const pkgName = async (f: string) => (await import(\`@kbn/repo-info/\${f}\`)).default.name;`,
          `export const nodeEnv = () => process.env.NODE_ENV;`,
          `export const methodImport = { import: (s: string) => s }.import(\`pkg\`);`,
        ].join('\n'),
        'server/plugin.ts': [
          `import { registry } from '../common';`,
          `import { getRouteInfo } from './routes/nested/route';`,
          `export class Plugin { setup() { return { registry, route: getRouteInfo() }; } }`,
        ].join('\n'),
        'server/routes/nested/route.ts': [
          `import Path from 'path';`,
          `const { ok } = require('./schema.json');`,
          `export const getRouteInfo = () => ({ dir: __dirname, file: __filename, ok, asset: Path.join(__dirname, 'schema.json') });`,
        ].join('\n'),
        'server/routes/lazy.ts': `export const LAZY = 'lazy';\n`,
        'server/types.ts': `export type T = 1;\n`,
      },
      ['server/routes/nested/schema.json', 'server/vendor/loaded_by_path.js']
    );

    await bundlePluginServer({
      srcPluginDir: src,
      distPluginDir: dist,
      entries: ['server/routes/lazy.js', 'server/routes/lazy'],
    });

    expect(Fs.existsSync(Path.join(dist, 'server/plugin.js'))).toBe(false);
    expect(Fs.existsSync(Path.join(dist, 'server/types.js'))).toBe(false);
    expect(Fs.existsSync(Path.join(dist, 'server/vendor/loaded_by_path.js'))).toBe(true);

    const server = req(Path.join(dist, 'server'));
    const { registry, route } = new server.Plugin().setup();
    expect(route).toEqual({
      dir: Path.join(dist, 'server/routes/nested'),
      file: Path.join(dist, 'server/routes/nested/route.js'),
      ok: 'yes',
      asset: Path.join(dist, 'server/routes/nested/schema.json'),
    });
    // `common` and the worker paths are stubs into the same module instances.
    expect(req(Path.join(dist, 'common')).registry).toBe(registry);
    expect(req(server.workerPath)).toEqual(expect.objectContaining({ LAZY: 'lazy' }));
    expect(req(server.resolvedPath)).toBe(req(server.workerPath));
    expect(await server.lazy()).toEqual(expect.objectContaining({ LAZY: 'lazy' }));
    expect(await server.pkgName('package.json')).toBe('@kbn/repo-info');
    expect(server.rawTag).toBe('café —');
    expect(server.nodeEnv()).toBe(process.env.NODE_ENV);
    expect(server.methodImport).toBe('pkg');
  });

  it('imports bare template-literal specifiers before the importing module ran', async () => {
    await setup({
      'server/index.ts': [
        `import { name } from './cycle';`,
        `export function load(f: string) { return import(\`@kbn/repo-info/\${f}\`); }`,
        `export { name };`,
      ].join('\n'),
      'server/cycle.ts': [
        `import { load } from '.';`,
        `export const name = load('package.json').then((m) => m.default.name);`,
      ].join('\n'),
    });
    await bundlePluginServer({ srcPluginDir: src, distPluginDir: dist, entries: [] });

    expect(await req(Path.join(dist, 'server')).name).toBe('@kbn/repo-info');
  });

  it('throws the same error each time a module that threw while loading is imported', async () => {
    await setup({
      'server/index.ts': `export const load = () => import('./broken');\n`,
      'server/broken.ts': `throw new Error('problem');\n`,
    });
    await bundlePluginServer({ srcPluginDir: src, distPluginDir: dist, entries: [] });

    const server = req(Path.join(dist, 'server'));
    await expect(server.load()).rejects.toThrow('problem');
    await expect(server.load()).rejects.toThrow('problem');
  });

  it('skips entries that did not ship as per-file output', async () => {
    await setup({ 'server/index.ts': `export const a = 1;\n` });
    await bundlePluginServer({
      srcPluginDir: src,
      distPluginDir: dist,
      entries: ['server/mocks', 'common'],
    });
    expect(Fs.readdirSync(Path.join(dist, 'server'))).toEqual(['index.js', 'index.js.map']);
  });

  it('maps stack frames of the minified bundle to the source', async () => {
    // Installed like in the distributable, whose root is the parent of `src`.
    dist = Path.join(Path.dirname(src), 'node_modules/@kbn/plugin');
    // The loader adds a line and rewrites calls before the throwing one.
    const failLine =
      "export const fail = () => require.resolve('./data.json') && import(`@kbn/repo-info/${'package.json'}`) && problem();";
    await setup(
      {
        'server/index.ts': `export { fail } from './lib/fail';\n`,
        'server/lib/fail.ts': [
          failLine,
          '',
          'const problem = () => {',
          "  throw new Error('problem');",
          '};',
        ].join('\n'),
      },
      ['server/lib/data.json']
    );
    await bundlePluginServer({ srcPluginDir: src, distPluginDir: dist, entries: [] });
    await minifyFile(Path.join(dist, 'server/index.js'));

    // In Node itself, since Jest's module wrapper shifts the first line's columns.
    const { stdout: stack } = await execa(process.execPath, [
      '-e',
      `try { require(${JSON.stringify(
        Path.join(dist, 'server')
      )}).fail(); } catch (e) { console.log(e.stack); }`,
    ]);
    const resolveStackTrace = createStackTraceResolver(Path.dirname(src));
    const file = `${Path.relative(REPO_ROOT, src)}/server/lib/fail.ts`;
    expect(resolveStackTrace(stack).split('\n').slice(1, 3)).toEqual([
      `    at problem (${file}:4:9)`,
      `    at Module.fail (${file}:1:${failLine.indexOf('problem()') + 1})`,
    ]);
  });

  it('finds modules referenced by deep imports or loaded by path', async () => {
    await write(
      Path.join(dist, 'a-plugin/server/lib/index.js'),
      [
        `require("@kbn/b-plugin/server/routes");`,
        `require("./not_by_path.js");`,
        `new Worker(require("path").join(__dirname, "../worker.js"));`,
        `new Worker(require.resolve("./resolved_worker"));`,
      ].join('\n')
    );
    await write(
      Path.join(dist, 'a-plugin/server/routes/public/index.js'),
      `require("@kbn/c-plugin/common/schemas");`
    );
    await write(Path.join(dist, 'a-plugin/public/index.js'), `require("@kbn/c-plugin/public/x");`);
    expect(await findEntries(dist)).toEqual(
      new Map([
        ['@kbn/b-plugin', new Set(['server/routes'])],
        ['@kbn/c-plugin', new Set(['common/schemas'])],
        ['@kbn/a-plugin', new Set(['server/worker.js', 'server/lib/resolved_worker'])],
      ])
    );
  });
});
