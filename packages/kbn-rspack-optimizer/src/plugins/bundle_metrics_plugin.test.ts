/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildMetrics, BundleMetricsPlugin } from './bundle_metrics_plugin';

/**
 * Create a mock chunk with the given name and JS files.
 * Async children are set via the `asyncChunks` array property (shared object
 * references) so that the claim-count Map (keyed by identity) works correctly.
 */
function createMockChunk(name: string | undefined, files: string[]) {
  const chunk: {
    name: string | undefined;
    files: Set<string>;
    auxiliaryFiles: Set<string>;
    asyncChunks: any[];
    getAllAsyncChunks: () => any[];
  } = {
    name,
    files: new Set(files),
    auxiliaryFiles: new Set<string>(),
    asyncChunks: [],
    getAllAsyncChunks() {
      return this.asyncChunks;
    },
  };
  return chunk;
}

/**
 * Create a mock compiler that captures the processAssets handler and lets
 * the test trigger it to collect the emitted metrics.json.
 */
function createMockCompiler() {
  let processAssetsHandler: (() => void) | undefined;
  const emittedAssets = new Map<string, string>();
  const assetSizes = new Map<string, number>();
  let compilationChunks: any[] = [];

  const compiler = {
    hooks: {
      compilation: {
        tap: jest.fn((_name: string, fn: (compilation: any) => void) => {
          fn({
            hooks: {
              processAssets: {
                tap: jest.fn((_opts: any, handler: () => void) => {
                  processAssetsHandler = handler;
                }),
              },
            },
            chunks: {
              [Symbol.iterator]: () => compilationChunks[Symbol.iterator](),
            },
            chunkGraph: {
              getChunkModules: () => [],
            },
            getAsset: (name: string) => {
              const size = assetSizes.get(name);
              return size != null ? { source: { size: () => size } } : undefined;
            },
            getAssets: () =>
              [...assetSizes.entries()].map(([n, s]) => ({
                name: n,
                source: { size: () => s },
              })),
            emitAsset: (name: string, source: { source: () => string | Buffer }) => {
              emittedAssets.set(name, source.source().toString());
            },
          });
        }),
      },
    },
  };

  return {
    compiler,
    setChunks(chunks: any[]) {
      compilationChunks = chunks;
    },
    setAssetSize(name: string, size: number) {
      assetSizes.set(name, size);
    },
    runProcessAssets() {
      processAssetsHandler!();
    },
    getEmittedMetrics(): any[] {
      const raw = emittedAssets.get('metrics.json');
      return raw ? JSON.parse(raw) : [];
    },
  };
}

describe('buildMetrics', () => {
  it('emits five metric groups per plugin in legacy order', () => {
    const metrics = buildMetrics(
      [
        {
          id: 'core',
          chunkName: 'kibana',
          limit: 500000,
          pageLoadSize: 450000,
          moduleCount: 583,
          asyncSize: 100000,
          asyncCount: 4,
          miscSize: 0,
        },
      ],
      { totalSize: 0, count: 0 },
      { totalSize: 0, count: 0 },
      450000
    );

    const coreMetrics = metrics.filter((m) => m.id === 'core');
    expect(coreMetrics).toHaveLength(5);
    expect(coreMetrics.map((m) => m.group)).toEqual([
      '@kbn/optimizer bundle module count',
      'page load bundle size',
      'async chunks size',
      'async chunk count',
      'miscellaneous assets size',
    ]);
  });

  it('uses id "core" (not "kibana") for the core entry', () => {
    const metrics = buildMetrics(
      [
        {
          id: 'core',
          chunkName: 'kibana',
          limit: 500000,
          pageLoadSize: 450000,
          moduleCount: 583,
          asyncSize: 0,
          asyncCount: 0,
          miscSize: 0,
        },
      ],
      { totalSize: 0, count: 0 },
      { totalSize: 0, count: 0 },
      450000
    );

    const coreModuleCount = metrics.find(
      (m) => m.group === '@kbn/optimizer bundle module count' && m.id === 'core'
    );
    expect(coreModuleCount).toBeDefined();
    expect(coreModuleCount!.value).toBe(583);

    const kibanaMetrics = metrics.filter((m) => m.id === 'kibana');
    expect(kibanaMetrics).toHaveLength(0);
  });

  it('includes limit and limitConfigPath only on page load bundle size', () => {
    const metrics = buildMetrics(
      [
        {
          id: 'discover',
          chunkName: 'plugin-discover',
          limit: 160000,
          pageLoadSize: 145000,
          moduleCount: 120,
          asyncSize: 85000,
          asyncCount: 3,
          miscSize: 0,
        },
      ],
      { totalSize: 0, count: 0 },
      { totalSize: 0, count: 0 },
      145000
    );

    const pageLoadMetric = metrics.find(
      (m) => m.group === 'page load bundle size' && m.id === 'discover'
    );
    expect(pageLoadMetric!.limit).toBe(160000);
    expect(pageLoadMetric!.limitConfigPath).toBe('packages/kbn-rspack-optimizer/limits.yml');

    const otherMetrics = metrics.filter(
      (m) => m.group !== 'page load bundle size' && m.id === 'discover'
    );
    for (const m of otherMetrics) {
      expect(m.limit).toBeUndefined();
      expect(m.limitConfigPath).toBeUndefined();
    }
  });

  it('omits limit when no limit exists in limits.yml', () => {
    const metrics = buildMetrics(
      [
        {
          id: 'core',
          chunkName: 'kibana',
          limit: undefined,
          pageLoadSize: 450000,
          moduleCount: 583,
          asyncSize: 0,
          asyncCount: 0,
          miscSize: 0,
        },
      ],
      { totalSize: 0, count: 0 },
      { totalSize: 0, count: 0 },
      450000
    );

    const pageLoadMetric = metrics.find(
      (m) => m.group === 'page load bundle size' && m.id === 'core'
    );
    expect(pageLoadMetric!.limit).toBeUndefined();
    expect(pageLoadMetric!.limitConfigPath).toBe('packages/kbn-rspack-optimizer/limits.yml');
  });

  it('emits shared chunk aggregate metrics', () => {
    const metrics = buildMetrics(
      [
        {
          id: 'core',
          chunkName: 'kibana',
          limit: 500000,
          pageLoadSize: 450000,
          moduleCount: 583,
          asyncSize: 0,
          asyncCount: 0,
          miscSize: 0,
        },
      ],
      { totalSize: 2500000, count: 8 },
      { totalSize: 0, count: 0 },
      3000000
    );

    const sharedSizeMetric = metrics.find((m) => m.group === 'shared chunks total size');
    expect(sharedSizeMetric).toEqual({
      group: 'shared chunks total size',
      id: 'all',
      value: 2500000,
    });

    const sharedCountMetric = metrics.find((m) => m.group === 'shared chunk count');
    expect(sharedCountMetric).toEqual({
      group: 'shared chunk count',
      id: 'all',
      value: 8,
    });
  });

  it('emits total optimizer output size metric', () => {
    const metrics = buildMetrics(
      [
        {
          id: 'core',
          chunkName: 'kibana',
          limit: 500000,
          pageLoadSize: 450000,
          moduleCount: 583,
          asyncSize: 0,
          asyncCount: 0,
          miscSize: 0,
        },
      ],
      { totalSize: 0, count: 0 },
      { totalSize: 0, count: 0 },
      45000000
    );

    const totalMetric = metrics.find((m) => m.group === 'total optimizer output size');
    expect(totalMetric).toEqual({
      group: 'total optimizer output size',
      id: 'all',
      value: 45000000,
    });
  });

  it('uses module count group name "@kbn/optimizer bundle module count" (same as legacy)', () => {
    const metrics = buildMetrics(
      [
        {
          id: 'core',
          chunkName: 'kibana',
          limit: 500000,
          pageLoadSize: 450000,
          moduleCount: 583,
          asyncSize: 0,
          asyncCount: 0,
          miscSize: 0,
        },
      ],
      { totalSize: 0, count: 0 },
      { totalSize: 0, count: 0 },
      450000
    );

    const moduleCountMetric = metrics.find((m) => m.id === 'core' && m.group.includes('module'));
    expect(moduleCountMetric!.group).toBe('@kbn/optimizer bundle module count');
  });

  it('aggregate metrics are ordered after all per-plugin metrics', () => {
    const metrics = buildMetrics(
      [
        {
          id: 'core',
          chunkName: 'kibana',
          limit: 500000,
          pageLoadSize: 450000,
          moduleCount: 583,
          asyncSize: 0,
          asyncCount: 0,
          miscSize: 0,
        },
        {
          id: 'discover',
          chunkName: 'plugin-discover',
          limit: 160000,
          pageLoadSize: 145000,
          moduleCount: 120,
          asyncSize: 85000,
          asyncCount: 3,
          miscSize: 0,
        },
      ],
      { totalSize: 2500000, count: 8 },
      { totalSize: 1200000, count: 42 },
      3000000
    );

    // Per-plugin metrics come first (5 per plugin, 2 plugins = 10)
    // Aggregate metrics are the last 5
    expect(metrics).toHaveLength(15);
    expect(metrics[10].group).toBe('shared chunks total size');
    expect(metrics[11].group).toBe('shared chunk count');
    expect(metrics[12].group).toBe('shared async chunks total size');
    expect(metrics[13].group).toBe('shared async chunk count');
    expect(metrics[14].group).toBe('total optimizer output size');
  });

  it('handles multiple plugins with correct async/misc values', () => {
    const metrics = buildMetrics(
      [
        {
          id: 'core',
          chunkName: 'kibana',
          limit: 500000,
          pageLoadSize: 2923530,
          moduleCount: 583,
          asyncSize: 449226,
          asyncCount: 4,
          miscSize: 0,
        },
        {
          id: 'discover',
          chunkName: 'plugin-discover',
          limit: 160000,
          pageLoadSize: 145000,
          moduleCount: 120,
          asyncSize: 85000,
          asyncCount: 3,
          miscSize: 1024,
        },
      ],
      { totalSize: 2500000, count: 8 },
      { totalSize: 0, count: 0 },
      45000000
    );

    const discoverAsync = metrics.find(
      (m) => m.group === 'async chunks size' && m.id === 'discover'
    );
    expect(discoverAsync!.value).toBe(85000);

    const discoverAsyncCount = metrics.find(
      (m) => m.group === 'async chunk count' && m.id === 'discover'
    );
    expect(discoverAsyncCount!.value).toBe(3);

    const discoverMisc = metrics.find(
      (m) => m.group === 'miscellaneous assets size' && m.id === 'discover'
    );
    expect(discoverMisc!.value).toBe(1024);
  });

  it('emits page load bundle size metrics for named shared chunks', () => {
    const metrics = buildMetrics(
      [
        {
          id: 'core',
          chunkName: 'plugin-core',
          limit: 500,
          pageLoadSize: 300,
          moduleCount: 10,
          asyncSize: 0,
          asyncCount: 0,
          miscSize: 0,
        },
        {
          id: 'shared-core',
          chunkName: 'shared-core',
          limit: 2000000,
          pageLoadSize: 1800000,
          moduleCount: 450,
          asyncSize: 0,
          asyncCount: 0,
          miscSize: 0,
        },
        {
          id: 'vendors',
          chunkName: 'vendors',
          limit: 5000000,
          pageLoadSize: 4500000,
          moduleCount: 200,
          asyncSize: 0,
          asyncCount: 0,
          miscSize: 0,
        },
      ],
      { totalSize: 15000, count: 1 },
      { totalSize: 0, count: 0 },
      6300300
    );

    const sharedCoreMetric = metrics.find(
      (m) => m.group === 'page load bundle size' && m.id === 'shared-core'
    );
    expect(sharedCoreMetric).toBeDefined();
    expect(sharedCoreMetric!.value).toBe(1800000);
    expect(sharedCoreMetric!.limit).toBe(2000000);
    expect(sharedCoreMetric!.limitConfigPath).toBe('packages/kbn-rspack-optimizer/limits.yml');

    const vendorsMetric = metrics.find(
      (m) => m.group === 'page load bundle size' && m.id === 'vendors'
    );
    expect(vendorsMetric).toBeDefined();
    expect(vendorsMetric!.value).toBe(4500000);
    expect(vendorsMetric!.limit).toBe(5000000);
  });

  it('named shared chunks get zero async/misc values', () => {
    const metrics = buildMetrics(
      [
        {
          id: 'shared-plugins',
          chunkName: 'shared-plugins',
          limit: 3000000,
          pageLoadSize: 2500000,
          moduleCount: 300,
          asyncSize: 0,
          asyncCount: 0,
          miscSize: 0,
        },
      ],
      { totalSize: 0, count: 0 },
      { totalSize: 0, count: 0 },
      2500000
    );

    const asyncSize = metrics.find(
      (m) => m.group === 'async chunks size' && m.id === 'shared-plugins'
    );
    expect(asyncSize!.value).toBe(0);

    const asyncCount = metrics.find(
      (m) => m.group === 'async chunk count' && m.id === 'shared-plugins'
    );
    expect(asyncCount!.value).toBe(0);

    const miscSize = metrics.find(
      (m) => m.group === 'miscellaneous assets size' && m.id === 'shared-plugins'
    );
    expect(miscSize!.value).toBe(0);
  });

  it('shared chunk entries are interleaved with plugin entries (pre-sorted input)', () => {
    const metrics = buildMetrics(
      [
        {
          id: 'core',
          chunkName: 'plugin-core',
          limit: 500,
          pageLoadSize: 300,
          moduleCount: 10,
          asyncSize: 0,
          asyncCount: 0,
          miscSize: 0,
        },
        {
          id: 'discover',
          chunkName: 'plugin-discover',
          limit: 160000,
          pageLoadSize: 145000,
          moduleCount: 120,
          asyncSize: 85000,
          asyncCount: 3,
          miscSize: 0,
        },
        {
          id: 'shared-core',
          chunkName: 'shared-core',
          limit: 2000000,
          pageLoadSize: 1800000,
          moduleCount: 450,
          asyncSize: 0,
          asyncCount: 0,
          miscSize: 0,
        },
      ],
      { totalSize: 0, count: 0 },
      { totalSize: 0, count: 0 },
      2000000
    );

    const pageLoadMetrics = metrics.filter((m) => m.group === 'page load bundle size');
    const ids = pageLoadMetrics.map((m) => m.id);
    expect(ids).toEqual(['core', 'discover', 'shared-core']);
  });
});

describe('BundleMetricsPlugin.apply() — async chunk filtering', () => {
  it('excludes named shared chunks from per-plugin async metrics', () => {
    const sharedChunkNames = new Set(['shared-plugins', 'vendors']);
    const plugin = new BundleMetricsPlugin(
      [{ id: 'discover', chunkName: 'plugin-discover', limit: 160000, ignoreMetrics: false }],
      sharedChunkNames
    );

    const mock = createMockCompiler();

    mock.setAssetSize('plugin-discover.js', 50000);
    mock.setAssetSize('shared-plugins.js', 9500000);
    mock.setAssetSize('vendors.js', 4000000);
    mock.setAssetSize('123.js', 8000);

    const sharedPluginsChunk = createMockChunk('shared-plugins', ['shared-plugins.js']);
    const vendorsChunk = createMockChunk('vendors', ['vendors.js']);
    const unnamed123 = createMockChunk(undefined, ['123.js']);
    const discoverChunk = createMockChunk('plugin-discover', ['plugin-discover.js']);
    discoverChunk.asyncChunks = [sharedPluginsChunk, vendorsChunk, unnamed123];

    mock.setChunks([discoverChunk, sharedPluginsChunk, vendorsChunk, unnamed123]);

    plugin.apply(mock.compiler as any);
    mock.runProcessAssets();

    const metrics = mock.getEmittedMetrics();
    const asyncSize = metrics.find(
      (m: any) => m.group === 'async chunks size' && m.id === 'discover'
    );
    const asyncCount = metrics.find(
      (m: any) => m.group === 'async chunk count' && m.id === 'discover'
    );

    expect(asyncSize.value).toBe(8000);
    expect(asyncCount.value).toBe(1);
  });

  it('excludes other plugin entry chunks from async metrics', () => {
    const sharedChunkNames = new Set(['shared-plugins']);
    const plugin = new BundleMetricsPlugin(
      [
        { id: 'discover', chunkName: 'plugin-discover', limit: 160000, ignoreMetrics: false },
        { id: 'dashboard', chunkName: 'plugin-dashboard', limit: 200000, ignoreMetrics: false },
      ],
      sharedChunkNames
    );

    const mock = createMockCompiler();

    mock.setAssetSize('plugin-discover.js', 50000);
    mock.setAssetSize('plugin-dashboard.js', 80000);
    mock.setAssetSize('shared-plugins.js', 5000000);
    mock.setAssetSize('456.js', 12000);

    const sharedPluginsChunk = createMockChunk('shared-plugins', ['shared-plugins.js']);
    const dashboardChunk = createMockChunk('plugin-dashboard', ['plugin-dashboard.js']);
    const unnamed456 = createMockChunk(undefined, ['456.js']);
    const discoverChunk = createMockChunk('plugin-discover', ['plugin-discover.js']);
    discoverChunk.asyncChunks = [sharedPluginsChunk, dashboardChunk, unnamed456];

    mock.setChunks([discoverChunk, dashboardChunk, sharedPluginsChunk, unnamed456]);

    plugin.apply(mock.compiler as any);
    mock.runProcessAssets();

    const metrics = mock.getEmittedMetrics();
    const discoverAsync = metrics.find(
      (m: any) => m.group === 'async chunks size' && m.id === 'discover'
    );

    expect(discoverAsync.value).toBe(12000);
  });

  it('passes through unnamed async chunks exclusive to one plugin', () => {
    const sharedChunkNames = new Set(['shared-plugins']);
    const plugin = new BundleMetricsPlugin(
      [{ id: 'maps', chunkName: 'plugin-maps', limit: 300000, ignoreMetrics: false }],
      sharedChunkNames
    );

    const mock = createMockCompiler();

    mock.setAssetSize('plugin-maps.js', 100000);
    mock.setAssetSize('shared-plugins.js', 5000000);
    mock.setAssetSize('100.js', 20000);
    mock.setAssetSize('101.js', 15000);

    const sharedPluginsChunk = createMockChunk('shared-plugins', ['shared-plugins.js']);
    const unnamed100 = createMockChunk(undefined, ['100.js']);
    const unnamed101 = createMockChunk(undefined, ['101.js']);
    const mapsChunk = createMockChunk('plugin-maps', ['plugin-maps.js']);
    mapsChunk.asyncChunks = [sharedPluginsChunk, unnamed100, unnamed101];

    mock.setChunks([mapsChunk, sharedPluginsChunk, unnamed100, unnamed101]);

    plugin.apply(mock.compiler as any);
    mock.runProcessAssets();

    const metrics = mock.getEmittedMetrics();
    const asyncSize = metrics.find((m: any) => m.group === 'async chunks size' && m.id === 'maps');
    const asyncCount = metrics.find((m: any) => m.group === 'async chunk count' && m.id === 'maps');

    expect(asyncSize.value).toBe(35000);
    expect(asyncCount.value).toBe(2);
  });

  it('reports zero async when all async children are shared chunks', () => {
    const sharedChunkNames = new Set(['shared-plugins', 'vendors']);
    const plugin = new BundleMetricsPlugin(
      [
        {
          id: 'painlessLab',
          chunkName: 'plugin-painlessLab',
          limit: 50000,
          ignoreMetrics: false,
        },
      ],
      sharedChunkNames
    );

    const mock = createMockCompiler();

    mock.setAssetSize('plugin-painlessLab.js', 16000);
    mock.setAssetSize('shared-plugins.js', 9500000);
    mock.setAssetSize('vendors.js', 4000000);

    const sharedPluginsChunk = createMockChunk('shared-plugins', ['shared-plugins.js']);
    const vendorsChunk = createMockChunk('vendors', ['vendors.js']);
    const painlessChunk = createMockChunk('plugin-painlessLab', ['plugin-painlessLab.js']);
    painlessChunk.asyncChunks = [sharedPluginsChunk, vendorsChunk];

    mock.setChunks([painlessChunk, sharedPluginsChunk, vendorsChunk]);

    plugin.apply(mock.compiler as any);
    mock.runProcessAssets();

    const metrics = mock.getEmittedMetrics();
    const asyncSize = metrics.find(
      (m: any) => m.group === 'async chunks size' && m.id === 'painlessLab'
    );
    const asyncCount = metrics.find(
      (m: any) => m.group === 'async chunk count' && m.id === 'painlessLab'
    );

    expect(asyncSize.value).toBe(0);
    expect(asyncCount.value).toBe(0);
  });
});

describe('BundleMetricsPlugin.apply() — exclusive-ownership attribution', () => {
  it('attributes unnamed chunk exclusively to one plugin when only that plugin reaches it', () => {
    const sharedChunkNames = new Set(['shared-plugins']);
    const plugin = new BundleMetricsPlugin(
      [
        { id: 'discover', chunkName: 'plugin-discover', limit: 160000, ignoreMetrics: false },
        { id: 'dashboard', chunkName: 'plugin-dashboard', limit: 200000, ignoreMetrics: false },
      ],
      sharedChunkNames
    );

    const mock = createMockCompiler();
    mock.setAssetSize('plugin-discover.js', 50000);
    mock.setAssetSize('plugin-dashboard.js', 80000);
    mock.setAssetSize('shared-plugins.js', 5000000);
    mock.setAssetSize('123.js', 8000);
    mock.setAssetSize('456.js', 12000);

    const sharedPluginsChunk = createMockChunk('shared-plugins', ['shared-plugins.js']);
    const exclusive123 = createMockChunk(undefined, ['123.js']);
    const exclusive456 = createMockChunk(undefined, ['456.js']);
    const discoverChunk = createMockChunk('plugin-discover', ['plugin-discover.js']);
    const dashboardChunk = createMockChunk('plugin-dashboard', ['plugin-dashboard.js']);
    discoverChunk.asyncChunks = [sharedPluginsChunk, exclusive123];
    dashboardChunk.asyncChunks = [sharedPluginsChunk, exclusive456];

    mock.setChunks([discoverChunk, dashboardChunk, sharedPluginsChunk, exclusive123, exclusive456]);

    plugin.apply(mock.compiler as any);
    mock.runProcessAssets();

    const metrics = mock.getEmittedMetrics();
    const discoverAsync = metrics.find(
      (m: any) => m.group === 'async chunks size' && m.id === 'discover'
    );
    const dashboardAsync = metrics.find(
      (m: any) => m.group === 'async chunks size' && m.id === 'dashboard'
    );
    const sharedAsyncTotal = metrics.find((m: any) => m.group === 'shared async chunks total size');

    expect(discoverAsync.value).toBe(8000);
    expect(dashboardAsync.value).toBe(12000);
    expect(sharedAsyncTotal.value).toBe(0);
  });

  it('puts unnamed chunk shared by two plugins into shared async aggregate', () => {
    const sharedChunkNames = new Set(['shared-plugins']);
    const plugin = new BundleMetricsPlugin(
      [
        { id: 'discover', chunkName: 'plugin-discover', limit: 160000, ignoreMetrics: false },
        { id: 'dashboard', chunkName: 'plugin-dashboard', limit: 200000, ignoreMetrics: false },
      ],
      sharedChunkNames
    );

    const mock = createMockCompiler();
    mock.setAssetSize('plugin-discover.js', 50000);
    mock.setAssetSize('plugin-dashboard.js', 80000);
    mock.setAssetSize('shared-plugins.js', 5000000);
    mock.setAssetSize('shared-unnamed.js', 25000);

    const sharedPluginsChunk = createMockChunk('shared-plugins', ['shared-plugins.js']);
    const sharedUnnamed = createMockChunk(undefined, ['shared-unnamed.js']);
    const discoverChunk = createMockChunk('plugin-discover', ['plugin-discover.js']);
    const dashboardChunk = createMockChunk('plugin-dashboard', ['plugin-dashboard.js']);
    discoverChunk.asyncChunks = [sharedPluginsChunk, sharedUnnamed];
    dashboardChunk.asyncChunks = [sharedPluginsChunk, sharedUnnamed];

    mock.setChunks([discoverChunk, dashboardChunk, sharedPluginsChunk, sharedUnnamed]);

    plugin.apply(mock.compiler as any);
    mock.runProcessAssets();

    const metrics = mock.getEmittedMetrics();
    const discoverAsync = metrics.find(
      (m: any) => m.group === 'async chunks size' && m.id === 'discover'
    );
    const dashboardAsync = metrics.find(
      (m: any) => m.group === 'async chunks size' && m.id === 'dashboard'
    );
    const sharedAsyncTotal = metrics.find((m: any) => m.group === 'shared async chunks total size');
    const sharedAsyncCount = metrics.find((m: any) => m.group === 'shared async chunk count');

    expect(discoverAsync.value).toBe(0);
    expect(dashboardAsync.value).toBe(0);
    expect(sharedAsyncTotal.value).toBe(25000);
    expect(sharedAsyncCount.value).toBe(1);
  });

  it('puts orphan unnamed chunk (not reachable from any plugin) into shared async', () => {
    const sharedChunkNames = new Set(['shared-plugins']);
    const plugin = new BundleMetricsPlugin(
      [{ id: 'discover', chunkName: 'plugin-discover', limit: 160000, ignoreMetrics: false }],
      sharedChunkNames
    );

    const mock = createMockCompiler();
    mock.setAssetSize('plugin-discover.js', 50000);
    mock.setAssetSize('shared-plugins.js', 5000000);
    mock.setAssetSize('789.js', 7000);

    const sharedPluginsChunk = createMockChunk('shared-plugins', ['shared-plugins.js']);
    const orphan789 = createMockChunk(undefined, ['789.js']);
    const discoverChunk = createMockChunk('plugin-discover', ['plugin-discover.js']);
    discoverChunk.asyncChunks = [sharedPluginsChunk];

    mock.setChunks([discoverChunk, sharedPluginsChunk, orphan789]);

    plugin.apply(mock.compiler as any);
    mock.runProcessAssets();

    const metrics = mock.getEmittedMetrics();
    const sharedAsyncTotal = metrics.find((m: any) => m.group === 'shared async chunks total size');
    const sharedAsyncCount = metrics.find((m: any) => m.group === 'shared async chunk count');

    expect(sharedAsyncTotal.value).toBe(7000);
    expect(sharedAsyncCount.value).toBe(1);
  });

  it('keeps kibana entry chunk in shared chunks total size (not shared async)', () => {
    const sharedChunkNames = new Set(['shared-plugins']);
    const plugin = new BundleMetricsPlugin(
      [{ id: 'discover', chunkName: 'plugin-discover', limit: 160000, ignoreMetrics: false }],
      sharedChunkNames
    );

    const mock = createMockCompiler();
    mock.setAssetSize('plugin-discover.js', 50000);
    mock.setAssetSize('shared-plugins.js', 5000000);
    mock.setAssetSize('kibana.bundle.js', 3000);

    const sharedPluginsChunk = createMockChunk('shared-plugins', ['shared-plugins.js']);
    const kibanaChunk = createMockChunk('kibana', ['kibana.bundle.js']);
    const discoverChunk = createMockChunk('plugin-discover', ['plugin-discover.js']);
    discoverChunk.asyncChunks = [sharedPluginsChunk];

    mock.setChunks([kibanaChunk, discoverChunk, sharedPluginsChunk]);

    plugin.apply(mock.compiler as any);
    mock.runProcessAssets();

    const metrics = mock.getEmittedMetrics();
    const sharedChunksTotal = metrics.find((m: any) => m.group === 'shared chunks total size');
    const sharedAsyncTotal = metrics.find((m: any) => m.group === 'shared async chunks total size');

    expect(sharedChunksTotal.value).toBe(3000);
    expect(sharedAsyncTotal.value).toBe(0);
  });

  it('mix: exclusive + shared unnamed chunks attributed correctly', () => {
    const sharedChunkNames = new Set(['shared-plugins']);
    const plugin = new BundleMetricsPlugin(
      [
        { id: 'discover', chunkName: 'plugin-discover', limit: 160000, ignoreMetrics: false },
        { id: 'dashboard', chunkName: 'plugin-dashboard', limit: 200000, ignoreMetrics: false },
      ],
      sharedChunkNames
    );

    const mock = createMockCompiler();
    mock.setAssetSize('plugin-discover.js', 50000);
    mock.setAssetSize('plugin-dashboard.js', 80000);
    mock.setAssetSize('shared-plugins.js', 5000000);
    mock.setAssetSize('exclusive-to-discover.js', 10000);
    mock.setAssetSize('shared-by-both.js', 30000);
    mock.setAssetSize('kibana.bundle.js', 2000);

    const sharedPluginsChunk = createMockChunk('shared-plugins', ['shared-plugins.js']);
    const exclusiveDiscover = createMockChunk(undefined, ['exclusive-to-discover.js']);
    const sharedByBoth = createMockChunk(undefined, ['shared-by-both.js']);
    const kibanaChunk = createMockChunk('kibana', ['kibana.bundle.js']);
    const discoverChunk = createMockChunk('plugin-discover', ['plugin-discover.js']);
    const dashboardChunk = createMockChunk('plugin-dashboard', ['plugin-dashboard.js']);
    discoverChunk.asyncChunks = [sharedPluginsChunk, exclusiveDiscover, sharedByBoth];
    dashboardChunk.asyncChunks = [sharedPluginsChunk, sharedByBoth];

    mock.setChunks([
      kibanaChunk,
      discoverChunk,
      dashboardChunk,
      sharedPluginsChunk,
      exclusiveDiscover,
      sharedByBoth,
    ]);

    plugin.apply(mock.compiler as any);
    mock.runProcessAssets();

    const metrics = mock.getEmittedMetrics();
    const discoverAsync = metrics.find(
      (m: any) => m.group === 'async chunks size' && m.id === 'discover'
    );
    const dashboardAsync = metrics.find(
      (m: any) => m.group === 'async chunks size' && m.id === 'dashboard'
    );
    const sharedChunksTotal = metrics.find((m: any) => m.group === 'shared chunks total size');
    const sharedAsyncTotal = metrics.find((m: any) => m.group === 'shared async chunks total size');

    expect(discoverAsync.value).toBe(10000);
    expect(dashboardAsync.value).toBe(0);
    expect(sharedChunksTotal.value).toBe(2000);
    expect(sharedAsyncTotal.value).toBe(30000);
  });
});
