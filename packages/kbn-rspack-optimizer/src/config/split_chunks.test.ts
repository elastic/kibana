/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getSplitChunksCacheGroups, getSharedChunkNames, JQUERY_FLOT_MODULE } from './split_chunks';

const asRegExp = (test: unknown): RegExp => {
  expect(test).toBeInstanceOf(RegExp);
  return test as RegExp;
};

describe('getSplitChunksCacheGroups', () => {
  it('returns an object with all expected cache group keys', () => {
    const groups = getSplitChunksCacheGroups();
    expect(Object.keys(groups)).toEqual(
      expect.arrayContaining([
        'defaultVendors',
        'jqueryFlot',
        'sharedPlugins',
        'corePackages',
        'sharedPackages',
        'solutionPackages',
        'rootPackages',
        'vendorsHeavy',
        'vendors',
        'default',
      ])
    );
  });

  it('disables defaultVendors', () => {
    const groups = getSplitChunksCacheGroups();
    expect(groups.defaultVendors).toBe(false);
  });

  it('uses static string names for named shared cache groups', () => {
    const groups = getSplitChunksCacheGroups();
    for (const [key, group] of Object.entries(groups)) {
      if (key === 'defaultVendors' || key === 'jqueryFlot') continue;
      expect(typeof (group as { name?: unknown }).name).toBe('string');
    }
  });

  it('vendorsHeavy uses a static name (not a function)', () => {
    const groups = getSplitChunksCacheGroups();
    const vendorsHeavy = groups.vendorsHeavy as { name: unknown };
    expect(vendorsHeavy.name).toBe('vendors-heavy');
    expect(typeof vendorsHeavy.name).toBe('string');
  });

  it('jqueryFlot is unnamed so bootstrap does not preload it', () => {
    const groups = getSplitChunksCacheGroups();
    const jqueryFlot = groups.jqueryFlot as {
      name: unknown;
      priority: number;
      minChunks: number;
      chunks: string;
    };
    expect(jqueryFlot.name).toBe(false);
    expect(jqueryFlot.priority).toBe(50);
    expect(jqueryFlot.minChunks).toBe(2);
    expect(jqueryFlot.chunks).toBe('async');
    expect(jqueryFlot.priority).toBeGreaterThan((groups.vendors as { priority: number }).priority);
    expect(jqueryFlot.priority).toBeGreaterThan(
      (groups.sharedPackages as { priority: number }).priority
    );
  });

  it('routes jquery and kbn-flot-charts to jqueryFlot, not vendors or shared-packages', () => {
    const groups = getSplitChunksCacheGroups();
    const jqueryFlot = asRegExp((groups.jqueryFlot as { test: unknown }).test);
    const vendors = asRegExp((groups.vendors as { test: unknown }).test);
    const sharedPackages = asRegExp((groups.sharedPackages as { test: unknown }).test);
    const defaultGroup = groups.default as {
      test: (module: { identifier: () => string }) => boolean;
    };
    const defaultTest = defaultGroup.test;

    const jqueryPath = '/repo/node_modules/jquery/dist/jquery.js';
    const flotPath = '/repo/src/platform/packages/shared/kbn-flot-charts/index.js';
    const lodashPath = '/repo/node_modules/lodash/lodash.js';
    const i18nPath = '/repo/src/platform/packages/shared/kbn-i18n/index.js';

    expect(jqueryFlot.test(jqueryPath)).toBe(true);
    expect(jqueryFlot.test(flotPath)).toBe(true);
    expect(jqueryFlot.test(lodashPath)).toBe(false);
    expect(jqueryFlot.test(i18nPath)).toBe(false);

    expect(vendors.test(jqueryPath)).toBe(false);
    expect(vendors.test(lodashPath)).toBe(true);
    expect(vendors.test('/repo/node_modules/jquery-ui/ui/widget.js')).toBe(true);

    expect(sharedPackages.test(flotPath)).toBe(false);
    expect(sharedPackages.test(i18nPath)).toBe(true);

    expect(defaultTest({ identifier: () => jqueryPath })).toBe(false);
    expect(defaultTest({ identifier: () => flotPath })).toBe(false);
    expect(defaultTest({ identifier: () => i18nPath })).toBe(true);
  });

  it('JQUERY_FLOT_MODULE matches jquery package roots and flot-charts files', () => {
    expect(JQUERY_FLOT_MODULE.test('/node_modules/jquery/dist/jquery.js')).toBe(true);
    expect(JQUERY_FLOT_MODULE.test('/node_modules/jquery')).toBe(true);
    expect(JQUERY_FLOT_MODULE.test('/packages/shared/kbn-flot-charts/lib/jquery_flot.js')).toBe(
      true
    );
    expect(JQUERY_FLOT_MODULE.test('/node_modules/@types/jquery/index.d.ts')).toBe(false);
  });
});

describe('getSharedChunkNames', () => {
  it('returns a Set of all static chunk names from the cache groups', () => {
    const names = getSharedChunkNames();
    expect(names).toBeInstanceOf(Set);
    expect(names).toContain('shared-core');
    expect(names).toContain('shared-plugins');
    expect(names).toContain('shared-packages');
    expect(names).toContain('shared-solution-packages');
    expect(names).toContain('shared-root-packages');
    expect(names).toContain('vendors');
    expect(names).toContain('vendors-heavy');
    expect(names).toContain('shared-misc');
  });

  it('does not include "false" entries (defaultVendors)', () => {
    const names = getSharedChunkNames();
    expect(names).not.toContain(false);
    expect(names).not.toContain('false');
  });

  it('does not treat jqueryFlot as a named shared chunk', () => {
    const names = getSharedChunkNames();
    expect(names).not.toContain('jqueryFlot');
    expect(names).not.toContain('jquery-flot');
  });

  it('does not include "kibana" (the entry chunk name)', () => {
    const names = getSharedChunkNames();
    expect(names).not.toContain('kibana');
  });

  it('returns the same set on repeated calls', () => {
    const a = getSharedChunkNames();
    const b = getSharedChunkNames();
    expect([...a].sort()).toEqual([...b].sort());
  });
});
