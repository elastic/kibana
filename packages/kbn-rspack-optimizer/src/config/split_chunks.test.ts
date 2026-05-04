/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getSplitChunksCacheGroups, getSharedChunkNames } from './split_chunks';

describe('getSplitChunksCacheGroups', () => {
  it('returns an object with all expected cache group keys', () => {
    const groups = getSplitChunksCacheGroups();
    expect(Object.keys(groups)).toEqual(
      expect.arrayContaining([
        'defaultVendors',
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

  it('uses static string names for all active cache groups', () => {
    const groups = getSplitChunksCacheGroups();
    for (const [key, group] of Object.entries(groups)) {
      if (key === 'defaultVendors') continue;
      expect(typeof (group as any).name).toBe('string');
    }
  });

  it('vendorsHeavy uses a static name (not a function)', () => {
    const groups = getSplitChunksCacheGroups();
    const vendorsHeavy = groups.vendorsHeavy as any;
    expect(vendorsHeavy.name).toBe('vendors-heavy');
    expect(typeof vendorsHeavy.name).toBe('string');
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
