/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import { XPackBannerPlugin, XPACK_ELASTIC_LICENSE_BANNER } from './xpack_banner_plugin';

const REPO_ROOT = '/mock/repo';
const XPACK_DIR = Path.resolve(REPO_ROOT, 'x-pack');

const MOCK_PLUGINS = [
  { id: 'security', contextDir: `${XPACK_DIR}/plugins/security` },
  { id: 'ml', contextDir: `${XPACK_DIR}/plugins/ml` },
  { id: 'discover', contextDir: `${REPO_ROOT}/src/plugins/discover` },
  { id: 'dashboard', contextDir: `${REPO_ROOT}/src/plugins/dashboard` },
];

interface MockAsset {
  source: { source: () => string };
}

function createMockCompilation(
  chunks: Array<{ name: string | null; files: string[] }>,
  assets: Record<string, string>
) {
  const assetStore = new Map<string, MockAsset>();
  for (const [filename, content] of Object.entries(assets)) {
    assetStore.set(filename, { source: { source: () => content } });
  }

  let processAssetsFn: (() => void) | undefined;

  const compilation = {
    chunks: new Set(chunks.map((c) => ({ name: c.name, files: new Set(c.files) }))),
    getAsset: (name: string) => assetStore.get(name),
    updateAsset: jest.fn((filename: string, newSource: { source: () => string }) => {
      assetStore.set(filename, { source: newSource });
    }),
    hooks: {
      processAssets: {
        tap: jest.fn((_opts: unknown, fn: () => void) => {
          processAssetsFn = fn;
        }),
      },
    },
  };

  const compiler = {
    hooks: {
      compilation: {
        tap: jest.fn((_name: string, fn: (c: typeof compilation) => void) => {
          fn(compilation);
        }),
      },
    },
  };

  return {
    compiler,
    compilation,
    runProcessAssets: () => {
      if (!processAssetsFn) throw new Error('processAssets was not registered');
      processAssetsFn();
    },
    getAssetContent: (filename: string) => {
      const asset = assetStore.get(filename);
      return asset?.source.source();
    },
  };
}

describe('XPackBannerPlugin', () => {
  it('prepends the Elastic License banner to x-pack plugin chunk JS assets', () => {
    const { compiler, runProcessAssets, getAssetContent } = createMockCompilation(
      [
        { name: 'plugin-security', files: ['chunks/plugin-security.abc123.js'] },
        { name: 'plugin-ml', files: ['chunks/plugin-ml.def456.js'] },
      ],
      {
        'chunks/plugin-security.abc123.js': 'console.log("security");',
        'chunks/plugin-ml.def456.js': 'console.log("ml");',
      }
    );

    const plugin = new XPackBannerPlugin(REPO_ROOT, MOCK_PLUGINS);
    plugin.apply(compiler as any);
    runProcessAssets();

    expect(getAssetContent('chunks/plugin-security.abc123.js')).toBe(
      XPACK_ELASTIC_LICENSE_BANNER + 'console.log("security");'
    );
    expect(getAssetContent('chunks/plugin-ml.def456.js')).toBe(
      XPACK_ELASTIC_LICENSE_BANNER + 'console.log("ml");'
    );
  });

  it('does not prepend banner to non-x-pack chunks', () => {
    const { compiler, runProcessAssets, getAssetContent } = createMockCompilation(
      [
        { name: 'plugin-security', files: ['chunks/plugin-security.abc123.js'] },
        { name: 'plugin-discover', files: ['chunks/plugin-discover.xyz789.js'] },
      ],
      {
        'chunks/plugin-security.abc123.js': 'console.log("security");',
        'chunks/plugin-discover.xyz789.js': 'console.log("discover");',
      }
    );

    const plugin = new XPackBannerPlugin(REPO_ROOT, MOCK_PLUGINS);
    plugin.apply(compiler as any);
    runProcessAssets();

    expect(getAssetContent('chunks/plugin-security.abc123.js')).toBe(
      XPACK_ELASTIC_LICENSE_BANNER + 'console.log("security");'
    );
    expect(getAssetContent('chunks/plugin-discover.xyz789.js')).toBe('console.log("discover");');
  });

  it('skips non-JS files (e.g., source maps)', () => {
    const { compiler, runProcessAssets, compilation, getAssetContent } = createMockCompilation(
      [
        {
          name: 'plugin-security',
          files: ['chunks/plugin-security.abc123.js', 'chunks/plugin-security.abc123.js.map'],
        },
      ],
      {
        'chunks/plugin-security.abc123.js': 'console.log("security");',
        'chunks/plugin-security.abc123.js.map': '{"version":3}',
      }
    );

    const plugin = new XPackBannerPlugin(REPO_ROOT, MOCK_PLUGINS);
    plugin.apply(compiler as any);
    runProcessAssets();

    expect(getAssetContent('chunks/plugin-security.abc123.js')).toBe(
      XPACK_ELASTIC_LICENSE_BANNER + 'console.log("security");'
    );
    expect(getAssetContent('chunks/plugin-security.abc123.js.map')).toBe('{"version":3}');
    expect(compilation.updateAsset).toHaveBeenCalledTimes(1);
  });

  it('skips chunks with null names', () => {
    const { compiler, runProcessAssets, compilation } = createMockCompilation(
      [{ name: null, files: ['chunks/abc123.js'] }],
      { 'chunks/abc123.js': 'console.log("split");' }
    );

    const plugin = new XPackBannerPlugin(REPO_ROOT, MOCK_PLUGINS);
    plugin.apply(compiler as any);
    runProcessAssets();

    expect(compilation.updateAsset).not.toHaveBeenCalled();
  });

  it('does nothing when no plugins are under x-pack', () => {
    const nonXpackPlugins = [
      { id: 'discover', contextDir: `${REPO_ROOT}/src/plugins/discover` },
      { id: 'dashboard', contextDir: `${REPO_ROOT}/src/plugins/dashboard` },
    ];

    const { compiler, runProcessAssets, compilation } = createMockCompilation(
      [{ name: 'plugin-discover', files: ['chunks/plugin-discover.abc123.js'] }],
      { 'chunks/plugin-discover.abc123.js': 'console.log("discover");' }
    );

    const plugin = new XPackBannerPlugin(REPO_ROOT, nonXpackPlugins);
    plugin.apply(compiler as any);
    runProcessAssets();

    expect(compilation.updateAsset).not.toHaveBeenCalled();
  });

  it('skips shared vendor chunks even if they exist alongside x-pack chunks', () => {
    const { compiler, runProcessAssets, compilation, getAssetContent } = createMockCompilation(
      [
        { name: 'plugin-security', files: ['chunks/plugin-security.abc123.js'] },
        { name: 'vendors-heavy', files: ['chunks/vendors-heavy.xyz789.js'] },
      ],
      {
        'chunks/plugin-security.abc123.js': 'console.log("security");',
        'chunks/vendors-heavy.xyz789.js': 'console.log("vendors");',
      }
    );

    const plugin = new XPackBannerPlugin(REPO_ROOT, MOCK_PLUGINS);
    plugin.apply(compiler as any);
    runProcessAssets();

    expect(getAssetContent('chunks/plugin-security.abc123.js')).toBe(
      XPACK_ELASTIC_LICENSE_BANNER + 'console.log("security");'
    );
    expect(getAssetContent('chunks/vendors-heavy.xyz789.js')).toBe('console.log("vendors");');
    expect(compilation.updateAsset).toHaveBeenCalledTimes(1);
  });

  it('registers on the compilation hook with the correct plugin name', () => {
    const { compiler } = createMockCompilation([], {});

    const plugin = new XPackBannerPlugin(REPO_ROOT, MOCK_PLUGINS);
    plugin.apply(compiler as any);

    expect(compiler.hooks.compilation.tap).toHaveBeenCalledWith(
      'XPackBannerPlugin',
      expect.any(Function)
    );
  });
});
