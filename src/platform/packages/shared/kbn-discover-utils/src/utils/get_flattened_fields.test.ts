/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getFlattenedFields } from './get_flattened_fields';

describe('getFlattenedFields', () => {
  interface TestDocument {
    fieldA: string;
    fieldB: number;
    fieldC?: string;
  }

  const mockDoc = {
    flattened: {
      fieldA: ['valueA'],
      fieldB: [42],
      fieldC: ['optionalValue'],
    },
  } as any;

  it('should correctly extract fields from a document', () => {
    const fields: Array<keyof TestDocument> = ['fieldA', 'fieldB'];
    const result = getFlattenedFields<TestDocument>(mockDoc, fields);

    expect(result).toEqual({
      fieldA: 'valueA',
      fieldB: 42,
    });
  });

  it('should return undefined for missing optional fields', () => {
    const fields: Array<keyof TestDocument> = ['fieldA', 'fieldC'];
    const docWithoutFieldC = {
      flattened: {
        fieldA: ['valueA'],
      },
    } as any;

    const result = getFlattenedFields<TestDocument>(docWithoutFieldC, fields);

    expect(result).toEqual({
      fieldA: 'valueA',
      fieldC: undefined,
    });
  });

  it('should handle non-array flattened fields', () => {
    const docWithNonArrayField = {
      flattened: {
        fieldA: 'valueA',
        fieldB: 42,
      },
    } as any;

    const fields: Array<keyof TestDocument> = ['fieldA', 'fieldB'];
    const result = getFlattenedFields<TestDocument>(docWithNonArrayField, fields);

    expect(result).toEqual({
      fieldA: 'valueA',
      fieldB: 42,
    });
  });
});
