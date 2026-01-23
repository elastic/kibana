/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataViewField } from '@kbn/data-views-plugin/common';
import type { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import {
  shouldShowFieldFilterInOutActions,
  shouldShowFieldFilterExistAction,
} from './should_show_field_filter_actions';

describe('shouldShowFieldFilterInOutActions', () => {
  const mockOnFilter: DocViewFilterFn = jest.fn();

  const createMockField = (
    filterable: boolean = true,
    isComputedColumn: boolean = false
  ): DataViewField => {
    return {
      name: 'test_field',
      type: 'string',
      filterable,
      isComputedColumn,
    } as DataViewField;
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('shouldShowFieldFilterInOutActions', () => {
    it('should return false when onFilter is undefined', () => {
      const field = createMockField(true, false);
      const result = shouldShowFieldFilterInOutActions({
        dataViewField: field,
        hideFilteringOnComputedColumns: false,
        onFilter: undefined,
      });
      expect(result).toBe(false);
    });

    it('should return true when onFilter is provided', () => {
      const field = createMockField(true, false);
      const result = shouldShowFieldFilterInOutActions({
        dataViewField: field,
        hideFilteringOnComputedColumns: false,
        onFilter: mockOnFilter,
      });
      expect(result).toBe(true);
    });

    it('should return false when field is not filterable', () => {
      const field = createMockField(false, false);
      const result = shouldShowFieldFilterInOutActions({
        dataViewField: field,
        hideFilteringOnComputedColumns: false,
        onFilter: mockOnFilter,
      });
      expect(result).toBe(false);
    });

    it('should return true for computed columns when hideFilteringOnComputedColumns is false', () => {
      const field = createMockField(true, true);
      const result = shouldShowFieldFilterInOutActions({
        dataViewField: field,
        hideFilteringOnComputedColumns: false,
        onFilter: mockOnFilter,
      });
      expect(result).toBe(true);
    });

    it('should return false for computed columns when hideFilteringOnComputedColumns is true', () => {
      const field = createMockField(true, true);
      const result = shouldShowFieldFilterInOutActions({
        dataViewField: field,
        hideFilteringOnComputedColumns: true,
        onFilter: mockOnFilter,
      });
      expect(result).toBe(false);
    });

    it('should return true for regular filterable fields when hideFilteringOnComputedColumns is true', () => {
      const field = createMockField(true, false);
      const result = shouldShowFieldFilterInOutActions({
        dataViewField: field,
        hideFilteringOnComputedColumns: true,
        onFilter: mockOnFilter,
      });
      expect(result).toBe(true);
    });
  });

  describe('shouldShowFieldFilterExistAction', () => {
    it('should return false when field is scripted', () => {
      const field = {
        name: 'scripted_field',
        type: 'string',
        filterable: true,
        scripted: true,
      } as DataViewField;

      const result = shouldShowFieldFilterExistAction({
        dataViewField: field,
        hideFilteringOnComputedColumns: false,
        onFilter: mockOnFilter,
      });
      expect(result).toBe(false);
    });

    it('should return true when field is not scripted', () => {
      const field = {
        name: 'regular_field',
        type: 'string',
        filterable: true,
        scripted: false,
      } as DataViewField;

      const result = shouldShowFieldFilterExistAction({
        dataViewField: field,
        hideFilteringOnComputedColumns: false,
        onFilter: mockOnFilter,
      });
      expect(result).toBe(true);
    });
  });
});
