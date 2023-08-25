/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import { isNestedFieldParent } from './nested_fields';
describe('isNestedFieldParent', () => {
  it('correctly identifies nested parent fields', () => {
    const dataView = {
      fields: {
        getByName: jest.fn((fieldName) => fieldName === 'nested.field'),
        getAll: jest.fn(() => [
          {
            name: 'nested.field',
            subType: {
              nested: {
                path: 'nested.field.path',
              },
            },
          },
          {
            name: 'otherField',
          },
        ]),
      },
    } as unknown as DataView;

    expect(isNestedFieldParent('nested', dataView)).toBe(true);
    expect(isNestedFieldParent('nested.field', dataView)).toBe(false);
    expect(isNestedFieldParent('otherField', dataView)).toBe(false);
    expect(isNestedFieldParent('whateverField', dataView)).toBe(false);
  });
});
