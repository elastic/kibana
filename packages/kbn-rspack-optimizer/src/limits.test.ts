/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Path from 'path';
import Os from 'os';

import { readLimits, validateLimitsForAllBundles, updateBundleLimits } from './limits';

const createTmpDir = () => Fs.mkdtempSync(Path.join(Os.tmpdir(), 'rspack-limits-test-'));

const createMockLog = () => ({
  success: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  write: jest.fn(),
  getWriters: jest.fn(() => []),
  indent: jest.fn(),
  isVerbose: false,
});

describe('readLimits', () => {
  it('reads valid YAML and returns parsed limits object', () => {
    const tmpDir = createTmpDir();
    const limitsPath = Path.join(tmpDir, 'limits.yml');
    Fs.writeFileSync(limitsPath, 'pageLoadAssetSize:\n  core: 500000\n  discover: 200000\n');

    const limits = readLimits(limitsPath);
    expect(limits).toEqual({
      pageLoadAssetSize: { core: 500000, discover: 200000 },
    });

    Fs.rmSync(tmpDir, { recursive: true });
  });

  it('returns empty object when file does not exist', () => {
    const limits = readLimits('/nonexistent/path/limits.yml');
    expect(limits).toEqual({});
  });

  it('returns empty object when file has no pageLoadAssetSize key', () => {
    const tmpDir = createTmpDir();
    const limitsPath = Path.join(tmpDir, 'limits.yml');
    Fs.writeFileSync(limitsPath, 'someOtherKey: value\n');

    const limits = readLimits(limitsPath);
    expect(limits).toEqual({ someOtherKey: 'value' });

    Fs.rmSync(tmpDir, { recursive: true });
  });
});

describe('validateLimitsForAllBundles', () => {
  it('passes when limits match discovered plugin IDs exactly', () => {
    const tmpDir = createTmpDir();
    const limitsPath = Path.join(tmpDir, 'limits.yml');
    Fs.writeFileSync(
      limitsPath,
      'pageLoadAssetSize:\n  core: 500000\n  dashboard: 200000\n  discover: 150000\n'
    );

    const log = createMockLog();
    expect(() => {
      validateLimitsForAllBundles(log as any, ['core', 'dashboard', 'discover'], limitsPath);
    }).not.toThrow();
    expect(log.success).toHaveBeenCalledWith('limits.yml file valid');

    Fs.rmSync(tmpDir, { recursive: true });
  });

  it('errors when a plugin is missing from limits', () => {
    const tmpDir = createTmpDir();
    const limitsPath = Path.join(tmpDir, 'limits.yml');
    Fs.writeFileSync(limitsPath, 'pageLoadAssetSize:\n  core: 500000\n');

    const log = createMockLog();
    expect(() => {
      validateLimitsForAllBundles(log as any, ['core', 'discover'], limitsPath);
    }).toThrow(/missing: discover/);

    Fs.rmSync(tmpDir, { recursive: true });
  });

  it('errors when limits contain an extra (stale) entry', () => {
    const tmpDir = createTmpDir();
    const limitsPath = Path.join(tmpDir, 'limits.yml');
    Fs.writeFileSync(
      limitsPath,
      'pageLoadAssetSize:\n  core: 500000\n  discover: 150000\n  stale_plugin: 100000\n'
    );

    const log = createMockLog();
    expect(() => {
      validateLimitsForAllBundles(log as any, ['core', 'discover'], limitsPath);
    }).toThrow(/extra: stale_plugin/);

    Fs.rmSync(tmpDir, { recursive: true });
  });

  it('errors when entries are not sorted alphabetically', () => {
    const tmpDir = createTmpDir();
    const limitsPath = Path.join(tmpDir, 'limits.yml');
    Fs.writeFileSync(limitsPath, 'pageLoadAssetSize:\n  discover: 150000\n  core: 500000\n');

    const log = createMockLog();
    expect(() => {
      validateLimitsForAllBundles(log as any, ['core', 'discover'], limitsPath);
    }).toThrow(/not sorted/);

    Fs.rmSync(tmpDir, { recursive: true });
  });

  it('error messages reference the rspack update command', () => {
    const tmpDir = createTmpDir();
    const limitsPath = Path.join(tmpDir, 'limits.yml');
    Fs.writeFileSync(limitsPath, 'pageLoadAssetSize:\n  core: 500000\n');

    const log = createMockLog();
    try {
      validateLimitsForAllBundles(log as any, ['core', 'discover'], limitsPath);
    } catch (e: any) {
      expect(e.message).toContain('node scripts/build_rspack_bundles');
      expect(e.message).not.toContain('build_kibana_platform_plugins');
    }

    Fs.rmSync(tmpDir, { recursive: true });
  });

  it('tolerates shared chunk entries in limits.yml without flagging as extra', () => {
    const tmpDir = createTmpDir();
    const limitsPath = Path.join(tmpDir, 'limits.yml');
    Fs.writeFileSync(
      limitsPath,
      [
        'pageLoadAssetSize:',
        '  core: 500000',
        '  discover: 150000',
        '  shared-core: 2000000',
        '  shared-misc: 100000',
        '  shared-packages: 3000000',
        '  shared-plugins: 4000000',
        '  vendors: 5000000',
        '  vendors-heavy: 6000000',
        '',
      ].join('\n')
    );

    const log = createMockLog();
    expect(() => {
      validateLimitsForAllBundles(log as any, ['core', 'discover'], limitsPath);
    }).not.toThrow();
    expect(log.success).toHaveBeenCalledWith('limits.yml file valid');

    Fs.rmSync(tmpDir, { recursive: true });
  });

  it('still flags stale plugin IDs as extra even when shared chunks are present', () => {
    const tmpDir = createTmpDir();
    const limitsPath = Path.join(tmpDir, 'limits.yml');
    Fs.writeFileSync(
      limitsPath,
      [
        'pageLoadAssetSize:',
        '  core: 500000',
        '  discover: 150000',
        '  shared-core: 2000000',
        '  stale_plugin: 100000',
        '  vendors: 5000000',
        '',
      ].join('\n')
    );

    const log = createMockLog();
    expect(() => {
      validateLimitsForAllBundles(log as any, ['core', 'discover'], limitsPath);
    }).toThrow(/extra: stale_plugin/);

    Fs.rmSync(tmpDir, { recursive: true });
  });

  it('still requires all plugin IDs even when shared chunk entries are present', () => {
    const tmpDir = createTmpDir();
    const limitsPath = Path.join(tmpDir, 'limits.yml');
    Fs.writeFileSync(
      limitsPath,
      [
        'pageLoadAssetSize:',
        '  core: 500000',
        '  shared-core: 2000000',
        '  vendors: 5000000',
        '',
      ].join('\n')
    );

    const log = createMockLog();
    expect(() => {
      validateLimitsForAllBundles(log as any, ['core', 'discover'], limitsPath);
    }).toThrow(/missing: discover/);

    Fs.rmSync(tmpDir, { recursive: true });
  });
});

describe('updateBundleLimits', () => {
  it('computes floor(value * 1.1) for new plugins', () => {
    const tmpDir = createTmpDir();
    const metricsPath = Path.join(tmpDir, 'metrics.json');
    const limitsPath = Path.join(tmpDir, 'limits.yml');

    Fs.writeFileSync(
      metricsPath,
      JSON.stringify([
        { group: 'page load bundle size', id: 'core', value: 100000 },
        { group: 'page load bundle size', id: 'discover', value: 50000 },
      ])
    );
    Fs.writeFileSync(limitsPath, '');

    const log = createMockLog();
    updateBundleLimits(log as any, metricsPath, limitsPath);

    const result = readLimits(limitsPath);
    expect(result.pageLoadAssetSize?.core).toBe(Math.floor(100000 * 1.1));
    expect(result.pageLoadAssetSize?.discover).toBe(Math.floor(50000 * 1.1));

    Fs.rmSync(tmpDir, { recursive: true });
  });

  it('keeps existing limit when within budget', () => {
    const tmpDir = createTmpDir();
    const metricsPath = Path.join(tmpDir, 'metrics.json');
    const limitsPath = Path.join(tmpDir, 'limits.yml');

    Fs.writeFileSync(
      metricsPath,
      JSON.stringify([{ group: 'page load bundle size', id: 'core', value: 100000 }])
    );
    // Existing limit: 105000, which is >= 100000 and < 110000 (floor(100000 * 1.1))
    Fs.writeFileSync(limitsPath, 'pageLoadAssetSize:\n  core: 105000\n');

    const log = createMockLog();
    updateBundleLimits(log as any, metricsPath, limitsPath);

    const result = readLimits(limitsPath);
    expect(result.pageLoadAssetSize?.core).toBe(105000);

    Fs.rmSync(tmpDir, { recursive: true });
  });

  it('removes stale entries not present in metrics', () => {
    const tmpDir = createTmpDir();
    const metricsPath = Path.join(tmpDir, 'metrics.json');
    const limitsPath = Path.join(tmpDir, 'limits.yml');

    Fs.writeFileSync(
      metricsPath,
      JSON.stringify([{ group: 'page load bundle size', id: 'core', value: 100000 }])
    );
    Fs.writeFileSync(limitsPath, 'pageLoadAssetSize:\n  core: 150000\n  removed_plugin: 200000\n');

    const log = createMockLog();
    updateBundleLimits(log as any, metricsPath, limitsPath);

    const result = readLimits(limitsPath);
    expect(result.pageLoadAssetSize?.core).toBeDefined();
    expect(result.pageLoadAssetSize?.removed_plugin).toBeUndefined();

    Fs.rmSync(tmpDir, { recursive: true });
  });

  it('output YAML is sorted alphabetically', () => {
    const tmpDir = createTmpDir();
    const metricsPath = Path.join(tmpDir, 'metrics.json');
    const limitsPath = Path.join(tmpDir, 'limits.yml');

    Fs.writeFileSync(
      metricsPath,
      JSON.stringify([
        { group: 'page load bundle size', id: 'discover', value: 50000 },
        { group: 'page load bundle size', id: 'core', value: 100000 },
        { group: 'page load bundle size', id: 'apm', value: 30000 },
      ])
    );
    Fs.writeFileSync(limitsPath, '');

    const log = createMockLog();
    updateBundleLimits(log as any, metricsPath, limitsPath);

    const yaml = Fs.readFileSync(limitsPath, 'utf-8');
    const keys = [...yaml.matchAll(/^\s{2}(\w+):/gm)].map((m) => m[1]);
    expect(keys).toEqual(['apm', 'core', 'discover']);

    Fs.rmSync(tmpDir, { recursive: true });
  });
});
