/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  compareLevels,
  isAclLevel,
  isEntryLevel,
  isGeneralAccessLevel,
  lowestAllowed,
  maxLevel,
} from './levels';

describe('levels', () => {
  it('recognizes known levels only', () => {
    expect(isAclLevel('manage')).toBe(true);
    expect(isAclLevel('owner')).toBe(false);
    expect(isAclLevel('EDIT')).toBe(false);
  });

  it('excludes manage from general access levels', () => {
    expect(isGeneralAccessLevel('none')).toBe(true);
    expect(isGeneralAccessLevel('edit')).toBe(true);
    expect(isGeneralAccessLevel('manage')).toBe(false);
    expect(isGeneralAccessLevel('everyone')).toBe(false);
  });

  it('excludes none from entry levels', () => {
    expect(isEntryLevel('use')).toBe(true);
    expect(isEntryLevel('none')).toBe(false);
    expect(isEntryLevel('owner')).toBe(false);
  });

  it('orders levels from none to manage', () => {
    expect(compareLevels('none', 'view')).toBeLessThan(0);
    expect(compareLevels('use', 'use')).toBe(0);
    expect(compareLevels('manage', 'edit')).toBeGreaterThan(0);
  });

  it('returns the higher of two levels', () => {
    expect(maxLevel('view', 'edit')).toBe('edit');
    expect(maxLevel('manage', 'use')).toBe('manage');
  });

  describe('lowestAllowed', () => {
    it('picks the most restrictive allowed value', () => {
      expect(lowestAllowed(['edit', 'none', 'use'], ['none', 'use', 'edit'])).toBe('none');
    });

    it('ignores values the type does not allow', () => {
      expect(lowestAllowed(['view', 'edit'], ['none', 'use', 'edit'])).toBe('edit');
      expect(lowestAllowed(['owner', 'EDIT', ''], ['none', 'use', 'edit'])).toBeUndefined();
    });

    it('returns nothing for no values', () => {
      expect(lowestAllowed([], ['none', 'use', 'edit'])).toBeUndefined();
    });
  });
});
