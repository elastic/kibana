/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FieldSetting } from '../types';
import { fieldSorter } from './sort_fields';

const createField = (parts: Partial<FieldSetting>): FieldSetting => ({
  displayName: 'displayName',
  name: 'field',
  value: 'value',
  requiresPageReload: false,
  type: 'string',
  category: [],
  ariaName: 'ariaName',
  isOverridden: false,
  defVal: 'defVal',
  isCustom: false,
  ...parts,
});

describe('fieldSorter', () => {
  it('sort fields based on their `order` field if present on both', () => {
    const fieldA = createField({ order: 3 });
    const fieldB = createField({ order: 1 });
    const fieldC = createField({ order: 2 });

    expect([fieldA, fieldB, fieldC].sort(fieldSorter)).toEqual([fieldB, fieldC, fieldA]);
  });
  it('fields with order defined are ordered first', () => {
    const fieldA = createField({ order: 2 });
    const fieldB = createField({ order: undefined });
    const fieldC = createField({ order: 1 });

    expect([fieldA, fieldB, fieldC].sort(fieldSorter)).toEqual([fieldC, fieldA, fieldB]);
  });
  it('sorts by `name` when fields have the same `order`', () => {
    const fieldA = createField({ order: 2, name: 'B' });
    const fieldB = createField({ order: 1 });
    const fieldC = createField({ order: 2, name: 'A' });

    expect([fieldA, fieldB, fieldC].sort(fieldSorter)).toEqual([fieldB, fieldC, fieldA]);
  });

  it('sorts by `name` when fields have no `order`', () => {
    const fieldA = createField({ order: undefined, name: 'B' });
    const fieldB = createField({ order: undefined, name: 'A' });
    const fieldC = createField({ order: 1 });

    expect([fieldA, fieldB, fieldC].sort(fieldSorter)).toEqual([fieldC, fieldB, fieldA]);
  });
});
