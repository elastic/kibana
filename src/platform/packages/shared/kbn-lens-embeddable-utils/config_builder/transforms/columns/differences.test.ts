/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fromDifferencesAPItoLensState, fromDifferencesLensStateToAPI } from './differences';
import type { DerivativeIndexPatternColumn } from '@kbn/lens-plugin/public';
import type {
  LensApiDifferencesOperation,
  LensApiFieldMetricOperations,
} from '../../schema/metric_ops';
import { capitalize } from 'lodash';

describe('Differences Transforms', () => {
  const apiColumnRef: LensApiFieldMetricOperations = {
    operation: 'sum',
    field: 'sales',
    label: 'Sum of Total Sales',
  };
  const testRef: { id: string; field: string; label: string } = {
    id: 'sumId',
    label: apiColumnRef.label!,
    field: apiColumnRef.field!,
  };

  describe('fromDifferencesAPItoLensState', () => {
    it('should transform basic differences configuration', () => {
      const input: LensApiDifferencesOperation = {
        operation: 'differences',
        of: apiColumnRef,
      };

      const expected: DerivativeIndexPatternColumn = {
        operationType: 'differences',
        references: [testRef.id],
        label: 'Differences of Sum of Total Sales',
        customLabel: false,
        isBucketed: false,
        dataType: 'number',
        filter: undefined,
        reducedTimeRange: undefined,
        params: {},
      };

      expect(fromDifferencesAPItoLensState(input, testRef)).toEqual(expected);
    });

    it('should handle custom label', () => {
      const input: LensApiDifferencesOperation = {
        operation: 'differences',
        label: 'Sales Change',
        of: apiColumnRef,
      };

      const result = fromDifferencesAPItoLensState(input, testRef);
      expect(result.label).toBe('Sales Change');
      expect(result.customLabel).toBe(true);
    });

    it('should handle missing reference label', () => {
      const input: LensApiDifferencesOperation = {
        operation: 'differences',
        of: apiColumnRef,
      };

      const emptyRef = { ...testRef, label: '' };
      const result = fromDifferencesAPItoLensState(input, emptyRef);
      expect(result.label).toBe('Differences of (incomplete)');
    });
  });

  describe('fromDifferencesLensStateToAPI', () => {
    it('should transform basic differences configuration', () => {
      const input: DerivativeIndexPatternColumn = {
        operationType: 'differences',
        references: [testRef.id],
        label: 'Differences of Sum of Total Sales',
        customLabel: false,
        isBucketed: false,
        dataType: 'number',
        filter: undefined,
      };

      const referenceOp: LensApiFieldMetricOperations = {
        operation: 'sum',
        field: 'sales',
      };

      const expected: LensApiDifferencesOperation = {
        operation: 'differences',
        of: referenceOp,
      };

      expect(fromDifferencesLensStateToAPI(input, referenceOp, 'Sum of Total Sales')).toEqual(
        expected
      );
    });

    it('should preserve custom label', () => {
      const input: DerivativeIndexPatternColumn = {
        operationType: 'differences',
        references: [testRef.id],
        label: 'Sales Change',
        customLabel: true,
        isBucketed: false,
        dataType: 'number',
        filter: undefined,
      };

      const referenceOp: LensApiFieldMetricOperations = {
        operation: 'sum',
        field: 'sales',
      };

      const result = fromDifferencesLensStateToAPI(input, referenceOp, 'Sum of Total Sales');
      expect(result.label).toBe('Sales Change');
    });

    it('should handle reference operation with different metrics', () => {
      const input: DerivativeIndexPatternColumn = {
        operationType: 'differences',
        references: [testRef.id],
        label: 'Differences of Sum of Total Sales',
        customLabel: false,
        isBucketed: false,
        dataType: 'number',
        filter: undefined,
      };

      const referenceMetrics: LensApiFieldMetricOperations[] = [
        {
          operation: 'average' as const,
          field: 'price',
        },
        { operation: 'median' as const, field: 'price' },
        { operation: 'max' as const, field: 'price' },
        { operation: 'min' as const, field: 'price' },
        { operation: 'sum' as const, field: 'price' },
        { operation: 'count' as const },
        { operation: 'count' as const, field: 'price' },
        { operation: 'unique_count' as const, field: 'price' },
        { operation: 'standard_deviation' as const, field: 'price' },
        { operation: 'percentile' as const, field: 'price', percentile: 90 },
        { operation: 'percentile_rank' as const, field: 'price', rank: 90 },
      ].map((column) => ({
        ...column,
        customLabel: false,
        label: `${capitalize(column.operation)} of ${column.field}`,
      }));

      for (const ref of referenceMetrics) {
        const result = fromDifferencesLensStateToAPI(
          { ...input, label: `Differences of ${ref.label!}` },
          ref,
          ref.label!
        );
        expect(result.of).toEqual(ref);
        expect(result.label).toBeUndefined();
      }
    });
  });

  describe('ofName helper', () => {
    it('should generate correct label with name', () => {
      const input: LensApiDifferencesOperation = {
        operation: 'differences',
        of: { ...apiColumnRef, label: 'Revenue' },
      };

      const ref = { ...testRef, label: 'Revenue' };
      const result = fromDifferencesAPItoLensState(input, ref);
      expect(result.label).toBe('Differences of Revenue');
    });

    it('should generate default label for empty name', () => {
      const input: LensApiDifferencesOperation = {
        operation: 'differences',
        of: { ...apiColumnRef, label: '' },
      };

      const ref = { ...testRef, label: '' };
      const result = fromDifferencesAPItoLensState(input, ref);
      expect(result.label).toBe('Differences of (incomplete)');
    });
  });
});
