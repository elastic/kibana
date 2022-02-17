/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { extract, inject } from './persistable_state';
import { Filter } from '@kbn/es-query';
import { DATA_VIEW_SAVED_OBJECT_TYPE } from '../../common';

describe('filter manager persistable state tests', () => {
  const filters: Filter[] = [
    { meta: { alias: 'test', disabled: false, negate: false, index: 'test' } },
  ];
  describe('reference injection', () => {
    test('correctly inserts reference to filter', () => {
      const updatedFilters = inject(filters, [
        { type: DATA_VIEW_SAVED_OBJECT_TYPE, name: 'test', id: '123' },
      ]);
      expect(updatedFilters[0]).toHaveProperty('meta.index', '123');
    });

    test('drops index setting if reference is missing', () => {
      const updatedFilters = inject(filters, [
        { type: DATA_VIEW_SAVED_OBJECT_TYPE, name: 'test123', id: '123' },
      ]);
      expect(updatedFilters[0]).toHaveProperty('meta.index', undefined);
    });
  });

  describe('reference extraction', () => {
    test('correctly extracts references', () => {
      const { state, references } = extract(filters);
      expect(state[0]).toHaveProperty('meta.index');
      expect(references[0]).toHaveProperty('id', 'test');
    });
  });
});
