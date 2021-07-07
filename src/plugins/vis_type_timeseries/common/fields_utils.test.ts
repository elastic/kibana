/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { toSanitizedFieldType } from './fields_utils';
import type { FieldSpec } from '../../data/common';

describe('fields_utils', () => {
  describe('toSanitizedFieldType', () => {
    const mockedField = {
      lang: 'painless',
      conflictDescriptions: {},
      aggregatable: true,
      name: 'name',
      type: 'type',
      esTypes: ['long', 'geo'],
    } as FieldSpec;

    test('should sanitize fields ', async () => {
      const fields = [mockedField] as FieldSpec[];

      expect(toSanitizedFieldType(fields)).toMatchInlineSnapshot(`
        Array [
          Object {
            "label": "name",
            "name": "name",
            "type": "type",
          },
        ]
      `);
    });

    test('should filter non-aggregatable fields', async () => {
      const fields: FieldSpec[] = [
        {
          ...mockedField,
          aggregatable: false,
        },
      ];

      expect(toSanitizedFieldType(fields)).toMatchInlineSnapshot(`Array []`);
    });

    test('should filter nested fields', async () => {
      const fields: FieldSpec[] = [
        {
          ...mockedField,
          subType: {
            nested: {
              path: 'path',
            },
          },
        },
      ];
      expect(toSanitizedFieldType(fields)).toMatchInlineSnapshot(`Array []`);
    });
  });
});
