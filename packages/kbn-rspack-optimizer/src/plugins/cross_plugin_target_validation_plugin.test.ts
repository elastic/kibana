/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginEntry } from '../types';
import { CrossPluginTargetValidationPlugin } from './cross_plugin_target_validation_plugin';

interface ResolveData {
  request: string;
  context: string;
  contextInfo: { issuer: string };
}

type BeforeResolveHandler = (data: ResolveData, cb: (err?: Error | null) => void) => void;
type AfterCompileHandler = (compilation: unknown, cb: (err?: Error | null) => void) => void;

function createMockCompiler() {
  let beforeResolveHandler: BeforeResolveHandler | undefined;
  let afterCompileHandler: AfterCompileHandler | undefined;

  const compiler = {
    hooks: {
      compile: {
        tap: jest.fn((_name: string, fn: (params: any) => void) => {
          fn({
            normalModuleFactory: {
              hooks: {
                beforeResolve: {
                  tapAsync: jest.fn((_n: string, handler: BeforeResolveHandler) => {
                    beforeResolveHandler = handler;
                  }),
                },
              },
            },
          });
        }),
      },
      afterCompile: {
        tapAsync: jest.fn((_name: string, handler: AfterCompileHandler) => {
          afterCompileHandler = handler;
        }),
      },
    },
  };

  const resolve = (data: ResolveData): Promise<void> =>
    new Promise((res, rej) => {
      if (!beforeResolveHandler) throw new Error('beforeResolve handler not registered');
      beforeResolveHandler(data, (err) => (err ? rej(err) : res()));
    });

  const finalize = (): Promise<Error | undefined> =>
    new Promise((res) => {
      if (!afterCompileHandler) throw new Error('afterCompile handler not registered');
      afterCompileHandler({}, (err) => res(err ?? undefined));
    });

  return { compiler, resolve, finalize };
}

function makePlugin(overrides: Partial<PluginEntry> = {}): PluginEntry {
  return {
    id: 'testPlugin',
    pkgId: '@kbn/test-plugin',
    contextDir: '/repo/plugins/test',
    targets: ['public'],
    requiredPlugins: [],
    requiredBundles: [],
    manifestPath: '/repo/plugins/test/kibana.jsonc',
    type: 'plugin',
    ignoreMetrics: false,
    ...overrides,
  };
}

const PLUGIN_A = makePlugin({
  id: 'pluginA',
  pkgId: '@kbn/plugin-a',
  contextDir: '/repo/plugins/plugin_a',
  targets: ['public'],
});

const PLUGIN_B = makePlugin({
  id: 'pluginB',
  pkgId: '@kbn/plugin-b',
  contextDir: '/repo/plugins/plugin_b',
  targets: ['public'],
});

const PLUGIN_B_WITH_COMMON = makePlugin({
  id: 'pluginB',
  pkgId: '@kbn/plugin-b',
  contextDir: '/repo/plugins/plugin_b',
  targets: ['public', 'common'],
});

describe('CrossPluginTargetValidationPlugin', () => {
  it('reports no error when all cross-plugin imports target declared dirs', async () => {
    const { compiler, resolve, finalize } = createMockCompiler();
    const plugin = new CrossPluginTargetValidationPlugin([PLUGIN_A, PLUGIN_B_WITH_COMMON]);
    plugin.apply(compiler as any);

    await resolve({
      request: '@kbn/plugin-b/common/types',
      context: '/repo/plugins/plugin_a/public',
      contextInfo: { issuer: '/repo/plugins/plugin_a/public/app.ts' },
    });

    const err = await finalize();
    expect(err).toBeUndefined();
  });

  it('detects an undeclared cross-plugin target', async () => {
    const { compiler, resolve, finalize } = createMockCompiler();
    const plugin = new CrossPluginTargetValidationPlugin([PLUGIN_A, PLUGIN_B]);
    plugin.apply(compiler as any);

    await resolve({
      request: '@kbn/plugin-b/common/foo',
      context: '/repo/plugins/plugin_a/public',
      contextInfo: { issuer: '/repo/plugins/plugin_a/public/app.ts' },
    });

    const err = await finalize();
    expect(err).toBeInstanceOf(Error);
    expect(err!.message).toContain('1 undeclared cross-plugin import target(s)');
    expect(err!.message).toContain('[pluginB] undeclared target "common/foo"');
  });

  it('allows imports to declared extraPublicDirs', async () => {
    const { compiler, resolve, finalize } = createMockCompiler();
    const plugin = new CrossPluginTargetValidationPlugin([PLUGIN_A, PLUGIN_B_WITH_COMMON]);
    plugin.apply(compiler as any);

    await resolve({
      request: '@kbn/plugin-b/common/types',
      context: '/repo/plugins/plugin_a/public',
      contextInfo: { issuer: '/repo/plugins/plugin_a/public/app.ts' },
    });

    const err = await finalize();
    expect(err).toBeUndefined();
  });

  it('matches target by prefix (common/sub/deep matches "common")', async () => {
    const { compiler, resolve, finalize } = createMockCompiler();
    const plugin = new CrossPluginTargetValidationPlugin([PLUGIN_A, PLUGIN_B_WITH_COMMON]);
    plugin.apply(compiler as any);

    await resolve({
      request: '@kbn/plugin-b/common/sub/deep',
      context: '/repo/plugins/plugin_a/public',
      contextInfo: { issuer: '/repo/plugins/plugin_a/public/app.ts' },
    });

    const err = await finalize();
    expect(err).toBeUndefined();
  });

  it('skips same-plugin imports', async () => {
    const pluginBOnlyPublic = makePlugin({
      id: 'pluginB',
      pkgId: '@kbn/plugin-b',
      contextDir: '/repo/plugins/plugin_b',
      targets: ['public'],
    });
    const { compiler, resolve, finalize } = createMockCompiler();
    const plugin = new CrossPluginTargetValidationPlugin([pluginBOnlyPublic]);
    plugin.apply(compiler as any);

    await resolve({
      request: '@kbn/plugin-b/common/internal',
      context: '/repo/plugins/plugin_b/public',
      contextInfo: { issuer: '/repo/plugins/plugin_b/public/app.ts' },
    });

    const err = await finalize();
    expect(err).toBeUndefined();
  });

  it('skips imports to non-plugin packages', async () => {
    const { compiler, resolve, finalize } = createMockCompiler();
    const plugin = new CrossPluginTargetValidationPlugin([PLUGIN_A]);
    plugin.apply(compiler as any);

    await resolve({
      request: '@kbn/some-package/utils',
      context: '/repo/plugins/plugin_a/public',
      contextInfo: { issuer: '/repo/plugins/plugin_a/public/app.ts' },
    });

    const err = await finalize();
    expect(err).toBeUndefined();
  });

  it('skips .json imports', async () => {
    const { compiler, resolve, finalize } = createMockCompiler();
    const plugin = new CrossPluginTargetValidationPlugin([PLUGIN_A, PLUGIN_B]);
    plugin.apply(compiler as any);

    await resolve({
      request: '@kbn/plugin-b/common/config.json',
      context: '/repo/plugins/plugin_a/public',
      contextInfo: { issuer: '/repo/plugins/plugin_a/public/app.ts' },
    });

    const err = await finalize();
    expect(err).toBeUndefined();
  });

  it('skips ?raw imports', async () => {
    const { compiler, resolve, finalize } = createMockCompiler();
    const plugin = new CrossPluginTargetValidationPlugin([PLUGIN_A, PLUGIN_B]);
    plugin.apply(compiler as any);

    await resolve({
      request: '@kbn/plugin-b/common/template.txt?raw',
      context: '/repo/plugins/plugin_a/public',
      contextInfo: { issuer: '/repo/plugins/plugin_a/public/app.ts' },
    });

    const err = await finalize();
    expect(err).toBeUndefined();
  });

  it('skips empty requests', async () => {
    const { compiler, resolve, finalize } = createMockCompiler();
    const plugin = new CrossPluginTargetValidationPlugin([PLUGIN_A, PLUGIN_B]);
    plugin.apply(compiler as any);

    await resolve({
      request: '',
      context: '/repo/plugins/plugin_a/public',
      contextInfo: { issuer: '/repo/plugins/plugin_a/public/app.ts' },
    });

    const err = await finalize();
    expect(err).toBeUndefined();
  });

  it('skips imports from files outside any known plugin contextDir', async () => {
    const { compiler, resolve, finalize } = createMockCompiler();
    const plugin = new CrossPluginTargetValidationPlugin([PLUGIN_A, PLUGIN_B]);
    plugin.apply(compiler as any);

    await resolve({
      request: '@kbn/plugin-b/common/foo',
      context: '/repo/packages/some-package/src',
      contextInfo: { issuer: '/repo/packages/some-package/src/index.ts' },
    });

    const err = await finalize();
    expect(err).toBeUndefined();
  });

  it('includes plugin ID, target, file, import, allowed targets, and fix suggestions in error', async () => {
    const { compiler, resolve, finalize } = createMockCompiler();
    const plugin = new CrossPluginTargetValidationPlugin([PLUGIN_A, PLUGIN_B]);
    plugin.apply(compiler as any);

    await resolve({
      request: '@kbn/plugin-b/common/foo',
      context: '/repo/plugins/plugin_a/public',
      contextInfo: { issuer: '/repo/plugins/plugin_a/public/app.ts' },
    });

    const err = await finalize();
    expect(err).toBeInstanceOf(Error);
    const msg = err!.message;
    expect(msg).toContain('[pluginB]');
    expect(msg).toContain('"common/foo"');
    expect(msg).toContain('File:    /repo/plugins/plugin_a/public/app.ts');
    expect(msg).toContain('Import:  @kbn/plugin-b/common/foo');
    expect(msg).toContain('Allowed: [public]');
    expect(msg).toContain('Add "common" to "extraPublicDirs"');
    expect(msg).toContain('Move the shared code to a @kbn/ package');
    expect(msg).toContain('Break the transitive chain');
  });

  it('aggregates multiple violations into a single error', async () => {
    const pluginC = makePlugin({
      id: 'pluginC',
      pkgId: '@kbn/plugin-c',
      contextDir: '/repo/plugins/plugin_c',
      targets: ['public'],
    });
    const { compiler, resolve, finalize } = createMockCompiler();
    const plugin = new CrossPluginTargetValidationPlugin([PLUGIN_A, PLUGIN_B, pluginC]);
    plugin.apply(compiler as any);

    await resolve({
      request: '@kbn/plugin-b/common/foo',
      context: '/repo/plugins/plugin_a/public',
      contextInfo: { issuer: '/repo/plugins/plugin_a/public/app.ts' },
    });
    await resolve({
      request: '@kbn/plugin-c/server/bar',
      context: '/repo/plugins/plugin_a/public',
      contextInfo: { issuer: '/repo/plugins/plugin_a/public/other.ts' },
    });

    const err = await finalize();
    expect(err).toBeInstanceOf(Error);
    expect(err!.message).toContain('2 undeclared cross-plugin import target(s)');
    expect(err!.message).toContain('[pluginB] undeclared target "common/foo"');
    expect(err!.message).toContain('[pluginC] undeclared target "server/bar"');
  });

  it('uses context as issuer fallback when contextInfo.issuer is missing', async () => {
    const { compiler, resolve, finalize } = createMockCompiler();
    const plugin = new CrossPluginTargetValidationPlugin([PLUGIN_A, PLUGIN_B]);
    plugin.apply(compiler as any);

    await resolve({
      request: '@kbn/plugin-b/common/foo',
      context: '/repo/plugins/plugin_a/public',
      contextInfo: { issuer: '' },
    });

    const err = await finalize();
    expect(err).toBeInstanceOf(Error);
    expect(err!.message).toContain('File:    /repo/plugins/plugin_a/public');
  });

  it('registers hooks with the correct plugin name', () => {
    const { compiler } = createMockCompiler();
    const plugin = new CrossPluginTargetValidationPlugin([PLUGIN_A]);
    plugin.apply(compiler as any);

    expect(compiler.hooks.compile.tap).toHaveBeenCalledWith(
      'CrossPluginTargetValidationPlugin',
      expect.any(Function)
    );
    expect(compiler.hooks.afterCompile.tapAsync).toHaveBeenCalledWith(
      'CrossPluginTargetValidationPlugin',
      expect.any(Function)
    );
  });
});
