/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SortField } from '@kbn/content-list-provider';
import { defineContentListSortField, resolveSortFieldMap, toSortField } from './sorting';

describe('sorting', () => {
  describe('toSortField', () => {
    it('maps the field descriptor to the UI sort field', () => {
      const field = defineContentListSortField({
        id: 'accessedAt',
        title: 'Recently viewed',
        descLabel: 'Recently viewed',
        allowedDirections: ['desc'],
        description: 'Stored in your browser.',
        getValue: () => 1,
        fallbackSort: { field: 'updatedAt', direction: 'desc' },
      });

      expect(toSortField(field)).toStrictEqual({
        field: 'accessedAt',
        name: 'Recently viewed',
        descLabel: 'Recently viewed',
        allowedDirections: ['desc'],
        description: 'Stored in your browser.',
      });
    });
  });

  describe('resolveSortFieldMap', () => {
    it('keeps allowedDirections and description when given a SortField array', () => {
      const fields: SortField[] = [
        {
          field: 'accessedAt',
          name: 'Recently viewed',
          allowedDirections: ['desc'],
          description: 'Stored in your browser.',
        },
      ];

      expect(resolveSortFieldMap(fields).accessedAt).toMatchObject({
        id: 'accessedAt',
        title: 'Recently viewed',
        allowedDirections: ['desc'],
        description: 'Stored in your browser.',
      });
    });

    it('merges a field map with the defaults', () => {
      const custom = defineContentListSortField({ id: 'status', title: 'Status' });
      const resolved = resolveSortFieldMap({ status: custom });

      expect(Object.keys(resolved)).toEqual(
        expect.arrayContaining(['title', 'updatedAt', 'status'])
      );
    });
  });
});
