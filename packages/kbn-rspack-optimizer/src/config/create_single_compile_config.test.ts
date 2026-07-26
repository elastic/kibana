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
import { findTargetEntry } from './create_single_compile_config';
import { filterStatsByFocus, type FocusPluginInfo } from '../plugins/emit_stats_plugin';

const tmpDir = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'kbn-find-target-entry-'));

function createFile(relativePath: string) {
  const fullPath = Path.join(tmpDir, relativePath);
  Fs.mkdirSync(Path.dirname(fullPath), { recursive: true });
  Fs.writeFileSync(fullPath, '// test');
}

beforeAll(() => {
  createFile('plugin-a/public/index.ts');
  createFile('plugin-a/common/index.ts');
  createFile('plugin-b/public/index.tsx');
  createFile('plugin-c/public/index.js');
  createFile('plugin-d/public/index.jsx');
  // plugin-e has no index files in common/
  Fs.mkdirSync(Path.join(tmpDir, 'plugin-e', 'common'), { recursive: true });
  Fs.writeFileSync(Path.join(tmpDir, 'plugin-e', 'common', 'utils.ts'), '// no index');
});

afterAll(() => {
  Fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('findTargetEntry', () => {
  it('finds index.ts in the public directory by default', () => {
    const result = findTargetEntry(Path.join(tmpDir, 'plugin-a'));
    expect(result).toBe(Path.join(tmpDir, 'plugin-a', 'public', 'index.ts'));
  });

  it('finds index.ts in an extraPublicDir target', () => {
    const result = findTargetEntry(Path.join(tmpDir, 'plugin-a'), 'common');
    expect(result).toBe(Path.join(tmpDir, 'plugin-a', 'common', 'index.ts'));
  });

  it('finds index.tsx', () => {
    const result = findTargetEntry(Path.join(tmpDir, 'plugin-b'), 'public');
    expect(result).toBe(Path.join(tmpDir, 'plugin-b', 'public', 'index.tsx'));
  });

  it('finds index.js', () => {
    const result = findTargetEntry(Path.join(tmpDir, 'plugin-c'), 'public');
    expect(result).toBe(Path.join(tmpDir, 'plugin-c', 'public', 'index.js'));
  });

  it('finds index.jsx', () => {
    const result = findTargetEntry(Path.join(tmpDir, 'plugin-d'), 'public');
    expect(result).toBe(Path.join(tmpDir, 'plugin-d', 'public', 'index.jsx'));
  });

  it('returns null when the target directory has no index file', () => {
    const result = findTargetEntry(Path.join(tmpDir, 'plugin-e'), 'common');
    expect(result).toBeNull();
  });

  it('returns null when the target directory does not exist', () => {
    const result = findTargetEntry(Path.join(tmpDir, 'plugin-a'), 'server');
    expect(result).toBeNull();
  });

  it('returns null when the plugin directory does not exist', () => {
    const result = findTargetEntry(Path.join(tmpDir, 'nonexistent'), 'public');
    expect(result).toBeNull();
  });
});

describe('filterStatsByFocus', () => {
  const dashboardFocus: FocusPluginInfo = {
    id: 'dashboard',
    contextDir: '/repo/plugins/dashboard',
  };
  const securityFocus: FocusPluginInfo = { id: 'security', contextDir: '/repo/plugins/security' };
  const nonExistentFocus: FocusPluginInfo = {
    id: 'nonExistent',
    contextDir: '/repo/plugins/nonExistent',
  };

  // RSPack-style stats: modules nested inside chunk.modules, no chunk.id.
  // Simulates splitChunks moving dashboard modules into a shared chunk.
  const mockStats = {
    hash: 'abc123',
    version: '1.0.0',
    timings: { total: 5000 },
    chunks: [
      {
        names: ['plugin-dashboard'],
        files: ['chunks/plugin-dashboard.abc.js'],
        modules: [
          {
            identifier: '/repo/plugins/dashboard/public/index.ts',
            name: './plugins/dashboard/public/index.ts',
          },
        ],
      },
      {
        names: ['plugin-dashboardEnhanced'],
        files: ['chunks/plugin-dashboardEnhanced.def.js'],
        modules: [
          {
            identifier: '/repo/plugins/dashboardEnhanced/public/index.ts',
            name: './plugins/dashboardEnhanced/public/index.ts',
          },
        ],
      },
      {
        names: ['shared-plugins'],
        files: ['chunks/shared-plugins.xyz.js'],
        modules: [
          {
            identifier: '/repo/plugins/dashboard/public/app.tsx',
            name: './plugins/dashboard/public/app.tsx',
          },
          {
            identifier: '/repo/plugins/security/public/nav.tsx',
            name: './plugins/security/public/nav.tsx',
          },
          {
            identifier: '/repo/node_modules/lodash/index.js',
            name: './node_modules/lodash/index.js',
          },
        ],
      },
      {
        names: ['plugin-data'],
        files: ['chunks/plugin-data.ghi.js'],
        modules: [
          {
            identifier: '/repo/plugins/data/public/index.ts',
            name: './plugins/data/public/index.ts',
          },
        ],
      },
      {
        names: ['plugin-security'],
        files: ['chunks/plugin-security.jkl.js'],
        modules: [
          {
            identifier: '/repo/plugins/security/public/index.ts',
            name: './plugins/security/public/index.ts',
          },
        ],
      },
      {
        names: ['vendors-heavy'],
        files: ['chunks/vendors-heavy.xyz.js'],
        modules: [
          {
            identifier: '/repo/node_modules/react/index.js',
            name: './node_modules/react/index.js',
          },
        ],
      },
    ],
    modules: [],
    assets: [
      { name: 'chunks/plugin-dashboard.abc.js', size: 1000 },
      { name: 'chunks/plugin-dashboardEnhanced.def.js', size: 1500 },
      { name: 'chunks/shared-plugins.xyz.js', size: 40000 },
      { name: 'chunks/plugin-data.ghi.js', size: 2000 },
      { name: 'chunks/plugin-security.jkl.js', size: 3000 },
      { name: 'chunks/vendors-heavy.xyz.js', size: 50000 },
      { name: 'kibana.bundle.js', size: 100000 },
    ],
  };

  it('includes the named plugin chunk', () => {
    const result = filterStatsByFocus(mockStats, [dashboardFocus]);
    const names = result.chunks.flatMap((c: any) => c.names);
    expect(names).toContain('plugin-dashboard');
  });

  it('includes shared chunks that contain modules from the focused plugin', () => {
    const result = filterStatsByFocus(mockStats, [dashboardFocus]);
    const names = result.chunks.flatMap((c: any) => c.names);
    expect(names).toContain('shared-plugins');
  });

  it('does not include chunks with a similar prefix (exact name match)', () => {
    const result = filterStatsByFocus(mockStats, [dashboardFocus]);
    const names = result.chunks.flatMap((c: any) => c.names);
    expect(names).not.toContain('plugin-dashboardEnhanced');
  });

  it('does not include unrelated chunks', () => {
    const result = filterStatsByFocus(mockStats, [dashboardFocus]);
    const names = result.chunks.flatMap((c: any) => c.names);
    expect(names).not.toContain('plugin-data');
    expect(names).not.toContain('vendors-heavy');
  });

  it('extracts modules from all focused chunks (named + shared)', () => {
    const result = filterStatsByFocus(mockStats, [dashboardFocus]);
    const moduleNames = result.modules.map((m: any) => m.name);
    expect(moduleNames).toContain('./plugins/dashboard/public/index.ts');
    expect(moduleNames).toContain('./plugins/dashboard/public/app.tsx');
  });

  it('includes all modules from shared chunks (not just focused plugin modules)', () => {
    const result = filterStatsByFocus(mockStats, [dashboardFocus]);
    const moduleNames = result.modules.map((m: any) => m.name);
    // shared-plugins chunk is included because it has a dashboard module,
    // so all modules from that chunk are included
    expect(moduleNames).toContain('./plugins/security/public/nav.tsx');
    expect(moduleNames).toContain('./node_modules/lodash/index.js');
  });

  it('returns assets only from focused chunks', () => {
    const result = filterStatsByFocus(mockStats, [dashboardFocus]);
    const assetNames = result.assets.map((a: any) => a.name);
    expect(assetNames).toContain('chunks/plugin-dashboard.abc.js');
    expect(assetNames).toContain('chunks/shared-plugins.xyz.js');
    expect(assetNames).not.toContain('chunks/plugin-data.ghi.js');
    expect(assetNames).not.toContain('kibana.bundle.js');
  });

  it('supports multiple focus IDs', () => {
    const result = filterStatsByFocus(mockStats, [dashboardFocus, securityFocus]);
    const chunkNames = result.chunks.flatMap((c: any) => c.names);
    expect(chunkNames).toContain('plugin-dashboard');
    expect(chunkNames).toContain('plugin-security');
    expect(chunkNames).toContain('shared-plugins');
  });

  it('deduplicates modules across focused chunks', () => {
    const statsWithDupes = {
      ...mockStats,
      chunks: [
        {
          names: ['plugin-dashboard'],
          files: ['a.js'],
          modules: [{ identifier: '/repo/plugins/dashboard/shared.ts', name: './shared.ts' }],
        },
        {
          names: ['plugin-security'],
          files: ['b.js'],
          modules: [{ identifier: '/repo/plugins/dashboard/shared.ts', name: './shared.ts' }],
        },
      ],
    };
    const result = filterStatsByFocus(statsWithDupes, [dashboardFocus, securityFocus]);
    const sharedCount = result.modules.filter((m: any) => m.name === './shared.ts').length;
    expect(sharedCount).toBe(1);
  });

  it('preserves non-filtered top-level keys', () => {
    const result = filterStatsByFocus(mockStats, [dashboardFocus]);
    expect(result.hash).toBe('abc123');
    expect(result.version).toBe('1.0.0');
    expect(result.timings).toEqual({ total: 5000 });
  });

  it('returns empty arrays when no chunks match', () => {
    const result = filterStatsByFocus(mockStats, [nonExistentFocus]);
    expect(result.chunks).toEqual([]);
    expect(result.modules).toEqual([]);
    expect(result.assets).toEqual([]);
  });

  it('handles stats with missing optional arrays', () => {
    const sparseStats = { hash: 'abc', version: '1.0.0' };
    const result = filterStatsByFocus(sparseStats, [dashboardFocus]);
    expect(result.chunks).toEqual([]);
    expect(result.modules).toEqual([]);
    expect(result.assets).toEqual([]);
  });

  it('falls back to top-level modules when chunks have IDs (webpack-style)', () => {
    const webpackFocus: FocusPluginInfo = { id: 'dashboard', contextDir: '/repo/dashboard' };
    const webpackStats = {
      hash: 'abc',
      chunks: [
        { id: 1, names: ['plugin-dashboard'], files: ['plugin-dashboard.js'], modules: [] },
        { id: 2, names: ['plugin-data'], files: ['plugin-data.js'], modules: [] },
      ],
      modules: [
        { identifier: '/repo/dashboard/index.ts', name: './dashboard/index.ts', chunks: [1] },
        { identifier: '/repo/data/index.ts', name: './data/index.ts', chunks: [2] },
      ],
      assets: [
        { name: 'plugin-dashboard.js', size: 100 },
        { name: 'plugin-data.js', size: 200 },
      ],
    };
    const result = filterStatsByFocus(webpackStats, [webpackFocus]);
    expect(result.modules).toHaveLength(1);
    expect(result.modules[0].name).toBe('./dashboard/index.ts');
  });
});
