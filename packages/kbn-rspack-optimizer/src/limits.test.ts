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

  describe('maxIncreaseFraction', () => {
    const setup = (metrics: unknown, limitsYaml: string) => {
      const tmpDir = createTmpDir();
      const metricsPath = Path.join(tmpDir, 'metrics.json');
      const limitsPath = Path.join(tmpDir, 'limits.yml');
      Fs.writeFileSync(metricsPath, JSON.stringify(metrics));
      Fs.writeFileSync(limitsPath, limitsYaml);
      return { tmpDir, metricsPath, limitsPath };
    };

    it('writes modest increases within the fraction', () => {
      const { tmpDir, metricsPath, limitsPath } = setup(
        [{ group: 'page load bundle size', id: 'core', value: 104000 }],
        'pageLoadAssetSize:\n  core: 100000\n'
      );

      const log = createMockLog();
      // new limit = floor(104000 * 1.1) = 114400, a 14.4% increase
      updateBundleLimits(log as any, metricsPath, limitsPath, { maxIncreaseFraction: 0.15 });

      expect(readLimits(limitsPath).pageLoadAssetSize?.core).toBe(114400);

      Fs.rmSync(tmpDir, { recursive: true });
    });

    it('refuses overages above the fraction and does not write', () => {
      const { tmpDir, metricsPath, limitsPath } = setup(
        [{ group: 'page load bundle size', id: 'core', value: 120000 }],
        'pageLoadAssetSize:\n  core: 100000\n'
      );

      const log = createMockLog();
      // measured 120000 exceeds limit 100000 by 20% > 15%
      expect(() =>
        updateBundleLimits(log as any, metricsPath, limitsPath, { maxIncreaseFraction: 0.15 })
      ).toThrow(
        /Refusing to update[\s\S]*core: measured 120000 exceeds limit 100000 by 20\.0% \(new limit would be 132000\)/
      );

      // limits.yml is untouched
      expect(readLimits(limitsPath).pageLoadAssetSize?.core).toBe(100000);

      Fs.rmSync(tmpDir, { recursive: true });
    });

    it('allows overages up to the fraction even though the written limit includes headroom', () => {
      const { tmpDir, metricsPath, limitsPath } = setup(
        [{ group: 'page load bundle size', id: 'core', value: 114000 }],
        'pageLoadAssetSize:\n  core: 100000\n'
      );

      const log = createMockLog();
      // measured 114000 exceeds limit 100000 by 14% <= 15%, allowed even though
      // the new limit (125400) is a 25.4% increase over the old one
      updateBundleLimits(log as any, metricsPath, limitsPath, { maxIncreaseFraction: 0.15 });

      expect(readLimits(limitsPath).pageLoadAssetSize?.core).toBe(125400);

      Fs.rmSync(tmpDir, { recursive: true });
    });

    it('does not cap new entries without an existing limit', () => {
      const { tmpDir, metricsPath, limitsPath } = setup(
        [{ group: 'page load bundle size', id: 'core', value: 1000000 }],
        ''
      );

      const log = createMockLog();
      updateBundleLimits(log as any, metricsPath, limitsPath, { maxIncreaseFraction: 0.15 });

      expect(readLimits(limitsPath).pageLoadAssetSize?.core).toBe(1100000);

      Fs.rmSync(tmpDir, { recursive: true });
    });

    it('does not treat limit decreases as increases', () => {
      const { tmpDir, metricsPath, limitsPath } = setup(
        [{ group: 'page load bundle size', id: 'core', value: 10000 }],
        'pageLoadAssetSize:\n  core: 1000000\n'
      );

      const log = createMockLog();
      // new limit = 11000, a 98.9% decrease — not an increase, allowed
      updateBundleLimits(log as any, metricsPath, limitsPath, { maxIncreaseFraction: 0.15 });

      expect(readLimits(limitsPath).pageLoadAssetSize?.core).toBe(11000);

      Fs.rmSync(tmpDir, { recursive: true });
    });
  });

  describe('onlyOverages', () => {
    const setup = (metrics: unknown, limitsYaml: string) => {
      const tmpDir = createTmpDir();
      const metricsPath = Path.join(tmpDir, 'metrics.json');
      const limitsPath = Path.join(tmpDir, 'limits.yml');
      Fs.writeFileSync(metricsPath, JSON.stringify(metrics));
      Fs.writeFileSync(limitsPath, limitsYaml);
      return { tmpDir, metricsPath, limitsPath };
    };

    it('bumps only the overaged bundle and leaves all other entries untouched', () => {
      const { tmpDir, metricsPath, limitsPath } = setup(
        [
          { group: 'page load bundle size', id: 'core', value: 104000 },
          { group: 'page load bundle size', id: 'discover', value: 50000 },
          { group: 'page load bundle size', id: 'dashboard', value: 5000 },
        ],
        [
          'pageLoadAssetSize:',
          '  core: 100000',
          '  dashboard: 200000', // over-provisioned: measured 5000, must stay 200000
          '  discover: 55000', // sufficient: value 50000 <= limit, must stay
          '  removed_plugin: 12345', // not in metrics: stale entry must stay
          '',
        ].join('\n')
      );

      const log = createMockLog();
      updateBundleLimits(log as any, metricsPath, limitsPath, { onlyOverages: true });

      const result = readLimits(limitsPath);
      expect(result.pageLoadAssetSize).toEqual({
        core: 114400, // floor(104000 * 1.1)
        dashboard: 200000,
        discover: 55000,
        removed_plugin: 12345,
      });

      Fs.rmSync(tmpDir, { recursive: true });
    });

    it('does not add entries for metrics without an existing limit', () => {
      const { tmpDir, metricsPath, limitsPath } = setup(
        [{ group: 'page load bundle size', id: 'new_plugin', value: 1000000 }],
        'pageLoadAssetSize:\n  core: 100000\n'
      );

      const log = createMockLog();
      updateBundleLimits(log as any, metricsPath, limitsPath, { onlyOverages: true });

      expect(readLimits(limitsPath).pageLoadAssetSize).toEqual({ core: 100000 });

      Fs.rmSync(tmpDir, { recursive: true });
    });

    it('leaves the file unwritten when nothing overages', () => {
      const yaml = 'pageLoadAssetSize:\n  core: 100000\n';
      const { tmpDir, metricsPath, limitsPath } = setup(
        [{ group: 'page load bundle size', id: 'core', value: 90000 }],
        yaml
      );

      const log = createMockLog();
      updateBundleLimits(log as any, metricsPath, limitsPath, { onlyOverages: true });

      expect(log.info).toHaveBeenCalledWith(
        'no limit overages found in metrics, limits file left unchanged'
      );
      expect(Fs.readFileSync(limitsPath, 'utf-8')).toBe(yaml);

      Fs.rmSync(tmpDir, { recursive: true });
    });

    it('still enforces maxIncreaseFraction on overage bumps', () => {
      const { tmpDir, metricsPath, limitsPath } = setup(
        [
          { group: 'page load bundle size', id: 'core', value: 104000 },
          { group: 'page load bundle size', id: 'discover', value: 500000 },
        ],
        'pageLoadAssetSize:\n  core: 100000\n  discover: 200000\n'
      );

      const log = createMockLog();
      expect(() =>
        updateBundleLimits(log as any, metricsPath, limitsPath, {
          onlyOverages: true,
          maxIncreaseFraction: 0.15,
        })
      ).toThrow(
        /Refusing to update[\s\S]*discover: measured 500000 exceeds limit 200000 by 150\.0% \(new limit would be 550000\)/
      );

      // nothing was written, not even the modest core bump
      expect(readLimits(limitsPath).pageLoadAssetSize).toEqual({
        core: 100000,
        discover: 200000,
      });

      Fs.rmSync(tmpDir, { recursive: true });
    });
  });
});
