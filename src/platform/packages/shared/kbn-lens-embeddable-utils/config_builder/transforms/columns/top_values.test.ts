/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fromTermsLensApiToLensState, fromTermsLensStateToAPI } from './top_values';
import type { TermsIndexPatternColumn } from '@kbn/lens-common';
import type { LensApiTermsOperation } from '../../schema/bucket_ops';
import { LENS_EMPTY_AS_NULL_DEFAULT_VALUE } from './utils';

describe('Top Values Transforms', () => {
  const columns = [
    {
      column: {
        id: 'metricCol1',
        operationType: 'sum' as const,
        sourceField: 'value',
        label: 'Sum of value',
        dataType: 'number' as const,
        params: {
          emptyAsNull: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
        },
        isBucketed: false,
      },
      id: 'metricCol1',
    },
    {
      column: {
        id: 'metricCol2',
        operationType: 'average' as const,
        sourceField: 'score',
        label: 'Average of score',
        dataType: 'number' as const,
        isBucketed: false,
      },
      id: 'metricCol2',
    },
  ];
  const getMetricColumnIdByIndex = (index: number) => columns[index]?.id;

  describe('fromTermsLensApiToLensState', () => {
    it('should transform basic terms configuration', () => {
      const input: LensApiTermsOperation = {
        operation: 'terms',
        fields: ['status'],
        size: 5,
      };

      const result = fromTermsLensApiToLensState(input, getMetricColumnIdByIndex);
      expect(result.operationType).toBe('terms');
      expect(result.sourceField).toBe('status');
      expect(result.params.size).toBe(5);
      expect(result.label).toBe('');
      expect(result.customLabel).toBe(false);
    });

    it('should handle secondary fields', () => {
      const input: LensApiTermsOperation = {
        operation: 'terms',
        fields: ['status', 'region'],
        size: 3,
      };

      const result = fromTermsLensApiToLensState(input, getMetricColumnIdByIndex);
      expect(result.params.secondaryFields).toEqual(['region']);
    });

    it('should handle custom label', () => {
      const input: LensApiTermsOperation = {
        operation: 'terms',
        fields: ['status'],
        size: 10,
        label: 'Custom Label',
      };

      const result = fromTermsLensApiToLensState(input, getMetricColumnIdByIndex);
      expect(result.label).toBe('Custom Label');
      expect(result.customLabel).toBe(true);
    });

    it('should handle includes and excludes', () => {
      const input: LensApiTermsOperation = {
        operation: 'terms',
        fields: ['status'],
        size: 5,
        includes: { as_regex: true, values: ['active', 'pending'] },
        excludes: { as_regex: false, values: ['inactive'] },
      };

      const result = fromTermsLensApiToLensState(input, getMetricColumnIdByIndex);
      expect(result.params.include).toEqual(['active', 'pending']);
      expect(result.params.includeIsRegex).toBe(true);
      expect(result.params.exclude).toEqual(['inactive']);
      expect(result.params.excludeIsRegex).toBe(false);
    });

    it('should handle orderBy column type', () => {
      const input: LensApiTermsOperation = {
        operation: 'terms',
        fields: ['status'],
        size: 5,
        rank_by: { type: 'column', metric: 0, direction: 'desc' },
      };

      const result = fromTermsLensApiToLensState(input, getMetricColumnIdByIndex);
      expect(result.params.orderBy).toEqual({ type: 'column', columnId: 'metricCol1' });
      expect(result.params.orderDirection).toBe('desc');
    });

    it('should fallback to alphabetical order if metric column id is missing', () => {
      const input: LensApiTermsOperation = {
        operation: 'terms',
        fields: ['status'],
        size: 5,
        rank_by: { type: 'column', metric: 3, direction: 'desc' },
      };

      const result = fromTermsLensApiToLensState(input, getMetricColumnIdByIndex);
      expect(result.params.orderBy).toEqual({ type: 'alphabetical', fallback: true });
      expect(result.params.orderDirection).toBe('desc');
    });
  });

  describe('fromTermsLensStateToAPI', () => {
    it('should transform basic terms lens state to API', () => {
      const input: TermsIndexPatternColumn = {
        operationType: 'terms',
        sourceField: 'status',
        customLabel: false,
        label: 'Top 5 values for status',
        isBucketed: true,
        dataType: 'string',
        params: {
          secondaryFields: [],
          size: 5,
          accuracyMode: false,
          include: [],
          includeIsRegex: false,
          exclude: [],
          excludeIsRegex: false,
          otherBucket: false,
          missingBucket: false,
          orderBy: { type: 'alphabetical' },
          orderDirection: 'asc',
          parentFormat: { id: 'terms' },
        },
      };

      const result = fromTermsLensStateToAPI(input, columns);
      expect(result.operation).toBe('terms');
      expect(result.fields).toEqual(['status']);
      expect(result.size).toBe(5);
      expect(result.other_bucket).toBeUndefined();
    });

    it('should handle secondary fields', () => {
      const input: TermsIndexPatternColumn = {
        operationType: 'terms',
        sourceField: 'status',
        customLabel: false,
        label: 'Top 5 values for status',
        isBucketed: true,
        dataType: 'string',
        params: {
          secondaryFields: ['region'],
          size: 5,
          accuracyMode: false,
          include: [],
          includeIsRegex: false,
          exclude: [],
          excludeIsRegex: false,
          otherBucket: false,
          missingBucket: false,
          orderBy: { type: 'alphabetical' },
          orderDirection: 'asc',
          parentFormat: { id: 'terms' },
        },
      };

      const result = fromTermsLensStateToAPI(input, columns);
      expect(result.fields).toEqual(['status', 'region']);
    });

    it('should handle includes and excludes', () => {
      const input: TermsIndexPatternColumn = {
        operationType: 'terms',
        sourceField: 'status',
        customLabel: false,
        label: 'Top 5 values for status',
        isBucketed: true,
        dataType: 'string',
        params: {
          secondaryFields: [],
          size: 5,
          accuracyMode: false,
          include: ['active', 'pending'],
          includeIsRegex: true,
          exclude: ['inactive'],
          excludeIsRegex: false,
          otherBucket: false,
          missingBucket: false,
          orderBy: { type: 'alphabetical' },
          orderDirection: 'asc',
          parentFormat: { id: 'terms' },
        },
      };

      const result = fromTermsLensStateToAPI(input, columns);
      expect(result.includes).toEqual({
        as_regex: true,
        values: ['active', 'pending'],
      });
      expect(result.excludes).toEqual({
        as_regex: false,
        values: ['inactive'],
      });
    });

    it('should handle orderBy column type', () => {
      const input: TermsIndexPatternColumn = {
        operationType: 'terms',
        sourceField: 'status',
        customLabel: false,
        label: 'Top 5 values for status',
        isBucketed: true,
        dataType: 'string',
        params: {
          secondaryFields: [],
          size: 5,
          accuracyMode: false,
          include: [],
          includeIsRegex: false,
          exclude: [],
          excludeIsRegex: false,
          otherBucket: false,
          missingBucket: false,
          orderBy: { type: 'column', columnId: 'metricCol2' },
          orderDirection: 'desc',
          parentFormat: { id: 'terms' },
        },
      };

      const result = fromTermsLensStateToAPI(input, columns);
      expect(result.rank_by).toEqual({ type: 'column', metric: 1, direction: 'desc' });
    });

    it('should handle custom label', () => {
      const input: TermsIndexPatternColumn = {
        operationType: 'terms',
        sourceField: 'status',
        customLabel: true,
        label: 'Custom Label',
        isBucketed: true,
        dataType: 'string',
        params: {
          secondaryFields: [],
          size: 5,
          accuracyMode: false,
          include: [],
          includeIsRegex: false,
          exclude: [],
          excludeIsRegex: false,
          otherBucket: false,
          missingBucket: false,
          orderBy: { type: 'alphabetical' },
          orderDirection: 'asc',
          parentFormat: { id: 'terms' },
        },
      };

      const result = fromTermsLensStateToAPI(input, columns);
      expect(result.label).toBe('Custom Label');
    });

    it('should handle grouping other values', () => {
      const input: TermsIndexPatternColumn = {
        operationType: 'terms',
        sourceField: 'status',
        customLabel: true,
        label: 'Custom Label',
        isBucketed: true,
        dataType: 'string',
        params: {
          secondaryFields: [],
          size: 5,
          accuracyMode: false,
          include: [],
          includeIsRegex: false,
          exclude: [],
          excludeIsRegex: false,
          otherBucket: true,
          missingBucket: false,
          orderBy: { type: 'alphabetical' },
          orderDirection: 'asc',
          parentFormat: { id: 'terms' },
        },
      };

      const result = fromTermsLensStateToAPI(input, columns);
      expect(result.label).toBe('Custom Label');
      expect(result.other_bucket).toEqual({
        include_documents_without_field: false,
      });
    });
  });
});
