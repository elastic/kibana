/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildMetrics } from './bundle_metrics_plugin';

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
      3000000
    );

    // Per-plugin metrics come first (5 per plugin, 2 plugins = 10)
    // Aggregate metrics are the last 3
    expect(metrics).toHaveLength(13);
    expect(metrics[10].group).toBe('shared chunks total size');
    expect(metrics[11].group).toBe('shared chunk count');
    expect(metrics[12].group).toBe('total optimizer output size');
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
      2000000
    );

    const pageLoadMetrics = metrics.filter((m) => m.group === 'page load bundle size');
    const ids = pageLoadMetrics.map((m) => m.id);
    expect(ids).toEqual(['core', 'discover', 'shared-core']);
  });
});
