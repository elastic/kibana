/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import { isNestedFieldParent } from './nested_fields';
describe('isNestedFieldParent', () => {
  it('correctly identifies nested parent fields', () => {
    const nestedField = {
      name: 'nested.field',
      type: 'keyword',
      subType: {
        nested: {
          path: 'nested.field.path',
        },
      },
    };
    const unnestedField = {
      name: 'unnested.field',
      type: 'keyword',
    };
    const list = [nestedField, unnestedField];

    const dataView = {
      fields: {
        getByName: jest.fn((fieldName) => list.find((field) => field.name === fieldName)),
        getAll: jest.fn(() => list),
      },
    } as unknown as DataView;

    expect(isNestedFieldParent('nested', dataView)).toBe(true);
    expect(isNestedFieldParent('nested.field', dataView)).toBe(false);
    expect(isNestedFieldParent('unnested.field', dataView)).toBe(false);
    expect(isNestedFieldParent('whateverField', dataView)).toBe(false);
  });
});
