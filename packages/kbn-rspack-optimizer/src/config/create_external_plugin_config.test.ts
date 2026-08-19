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
import Os from 'os';
import { createCrossPluginExternals, createPluginWrapper } from './create_external_plugin_config';

// ──────────────────────────────────────────────
// Part 2 Tests: createCrossPluginExternals
// ──────────────────────────────────────────────

describe('createCrossPluginExternals', () => {
  const pluginTargets = new Map([
    ['@kbn/discover-plugin', { pluginId: 'discover', targets: ['public', 'common'] }],
    ['@kbn/dashboard-plugin', { pluginId: 'dashboard', targets: ['public'] }],
  ]);

  const externals = createCrossPluginExternals(pluginTargets);

  const call = (request: string): Promise<{ err?: Error; result?: string }> =>
    new Promise((resolve) => {
      externals({ request }, (err?: Error, result?: string) => {
        resolve({ err, result });
      });
    });

  it('externalizes a valid public target', async () => {
    const { err, result } = await call('@kbn/discover-plugin/public');
    expect(err).toBeUndefined();
    expect(result).toBe(`__kbnBundles__.get('plugin/discover/public')`);
  });

  it('externalizes a valid extraPublicDir target', async () => {
    const { err, result } = await call('@kbn/discover-plugin/common');
    expect(err).toBeUndefined();
    expect(result).toBe(`__kbnBundles__.get('plugin/discover/common')`);
  });

  it('errors on an undeclared target', async () => {
    const { err, result } = await call('@kbn/discover-plugin/server');
    expect(err).toBeInstanceOf(Error);
    expect(err!.message).toMatch(
      /import \[@kbn\/discover-plugin\/server\] references a non-public export of the \[discover\] bundle/
    );
    expect(err!.message).toMatch(/public directories: \[public,common\]/);
    expect(result).toBeUndefined();
  });

  it('errors on a bare import (empty target) to a plugin that requires it', async () => {
    const { err } = await call('@kbn/discover-plugin');
    expect(err).toBeInstanceOf(Error);
    expect(err!.message).toMatch(/references a non-public export/);
  });

  it('passes through unknown @kbn packages (not in pluginTargets)', async () => {
    const { err, result } = await call('@kbn/unknown-package/public');
    expect(err).toBeUndefined();
    expect(result).toBeUndefined();
  });

  it('passes through non-@kbn imports', async () => {
    const { err, result } = await call('lodash');
    expect(err).toBeUndefined();
    expect(result).toBeUndefined();
  });

  it('externalizes @kbn/core/public', async () => {
    const { err, result } = await call('@kbn/core/public');
    expect(err).toBeUndefined();
    expect(result).toBe(`__kbnBundles__.get('entry/core/public')`);
  });

  it('externalizes @kbn/core/public/subpath', async () => {
    const { err, result } = await call('@kbn/core/public/http');
    expect(err).toBeUndefined();
    expect(result).toBe(`__kbnBundles__.get('entry/core/public')`);
  });

  it('passes through @kbn/core/server (not public)', async () => {
    const { err, result } = await call('@kbn/core/server');
    expect(err).toBeUndefined();
    expect(result).toBeUndefined();
  });

  it('passes through .json imports', async () => {
    const { err, result } = await call('@kbn/discover-plugin/common/config.json');
    expect(err).toBeUndefined();
    expect(result).toBeUndefined();
  });

  it('passes through ?raw imports', async () => {
    const { err, result } = await call('@kbn/discover-plugin/public/template.html?raw');
    expect(err).toBeUndefined();
    expect(result).toBeUndefined();
  });

  it('passes through undefined request', async () => {
    const { err, result } = await new Promise<{ err?: Error; result?: string }>((resolve) => {
      externals({ request: undefined }, (e?: Error, r?: string) => resolve({ err: e, result: r }));
    });
    expect(err).toBeUndefined();
    expect(result).toBeUndefined();
  });
});

// ──────────────────────────────────────────────
// Part 3 Tests: createPluginWrapper
// ──────────────────────────────────────────────

describe('createPluginWrapper', () => {
  const tmpDir = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'kbn-wrapper-test-'));
  const wrapperDir = Path.join(tmpDir, 'wrappers');
  const pluginDir = Path.join(tmpDir, 'my-plugin');

  beforeAll(() => {
    Fs.mkdirSync(Path.join(pluginDir, 'public'), { recursive: true });
    Fs.writeFileSync(Path.join(pluginDir, 'public', 'index.ts'), 'export const x = 1;');
    Fs.mkdirSync(Path.join(pluginDir, 'common'), { recursive: true });
    Fs.writeFileSync(Path.join(pluginDir, 'common', 'index.ts'), 'export const y = 2;');
    Fs.mkdirSync(wrapperDir, { recursive: true });
  });

  afterAll(() => {
    Fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('generates registrations for all declared targets', () => {
    const wrapperPath = createPluginWrapper(wrapperDir, 'myPlugin', pluginDir, [
      'public',
      'common',
    ]);

    const content = Fs.readFileSync(wrapperPath, 'utf-8');

    expect(content).toContain(`__kbnBundles__.define('plugin/myPlugin/public'`);
    expect(content).toContain(`__kbnBundles__.define('plugin/myPlugin/common'`);
    expect(content).toContain(`import * as plugin_public from`);
    expect(content).toContain(`import * as plugin_common from`);
  });

  it('generates only public registration when no extraPublicDirs', () => {
    const wrapperPath = createPluginWrapper(wrapperDir, 'simplePlugin', pluginDir, ['public']);

    const content = Fs.readFileSync(wrapperPath, 'utf-8');

    expect(content).toContain(`__kbnBundles__.define('plugin/simplePlugin/public'`);
    expect(content).not.toContain(`plugin/simplePlugin/common`);
  });

  it('skips extra targets whose directory has no index file', () => {
    const wrapperPath = createPluginWrapper(wrapperDir, 'partialPlugin', pluginDir, [
      'public',
      'server',
    ]);

    const content = Fs.readFileSync(wrapperPath, 'utf-8');

    expect(content).toContain(`__kbnBundles__.define('plugin/partialPlugin/public'`);
    expect(content).not.toContain(`plugin/partialPlugin/server`);
  });

  it('throws when no targets have index files', () => {
    expect(() => {
      createPluginWrapper(wrapperDir, 'emptyPlugin', pluginDir, ['server', 'nonexistent']);
    }).toThrow(/No entry points found for plugin emptyPlugin/);
  });
});
