/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fromFormulaAPItoLensState, fromFormulaLensStateToAPI } from './formula';
import type { FormulaIndexPatternColumn } from '@kbn/lens-common';
import type { LensApiFormulaOperation } from '../../schema/metric_ops';

describe('Formula Transforms', () => {
  describe('fromFormulaAPItoLensState', () => {
    it('should transform basic formula configuration', () => {
      const input: LensApiFormulaOperation = {
        operation: 'formula',
        formula: 'count(col1) / sum(col2)',
      };

      const expected: FormulaIndexPatternColumn = {
        operationType: 'formula',
        label: '',
        customLabel: false,
        dataType: 'number',
        isBucketed: false,
        references: [],
        params: {
          formula: 'count(col1) / sum(col2)',
        },
      };

      expect(fromFormulaAPItoLensState(input)).toEqual(expected);
    });

    it('should handle empty formula', () => {
      const input: LensApiFormulaOperation = {
        operation: 'formula',
        formula: '',
      };

      const result = fromFormulaAPItoLensState(input);
      expect(result.params.formula).toBe('');
    });

    it('should handle format configuration', () => {
      const input: LensApiFormulaOperation = {
        operation: 'formula',
        formula: 'col1 + col2',
        format: {
          type: 'number',
          decimals: 2,
          compact: false,
        },
      };

      const result = fromFormulaAPItoLensState(input);
      expect(result.params.format).toEqual({
        id: 'number',
        params: {
          decimals: 2,
          compact: false,
        },
      });
    });

    it('should handle custom label', () => {
      const input: LensApiFormulaOperation = {
        operation: 'formula',
        formula: 'col1 + col2',
        label: 'Custom Formula',
      };

      const result = fromFormulaAPItoLensState(input);
      expect(result.label).toBe('Custom Formula');
      expect(result.customLabel).toBe(true);
    });
  });

  describe('fromFormulaLensStateToAPI', () => {
    it('should transform basic formula configuration', () => {
      const input: FormulaIndexPatternColumn = {
        operationType: 'formula',
        label: 'count(col1) / sum(col2)',
        customLabel: false,
        dataType: 'number',
        isBucketed: false,
        references: [],
        params: {
          formula: 'count(col1) / sum(col2)',
        },
      };

      const expected: LensApiFormulaOperation = {
        operation: 'formula',
        formula: 'count(col1) / sum(col2)',
      };

      expect(fromFormulaLensStateToAPI(input)).toEqual(expected);
    });

    it('should handle empty formula', () => {
      const input: FormulaIndexPatternColumn = {
        operationType: 'formula',
        label: 'Formula',
        customLabel: false,
        dataType: 'number',
        isBucketed: false,
        references: [],
        params: {},
      };

      const result = fromFormulaLensStateToAPI(input);
      expect(result.formula).toBe('');
    });

    it('should handle format configuration', () => {
      const input: FormulaIndexPatternColumn = {
        operationType: 'formula',
        label: 'Formula',
        customLabel: false,
        dataType: 'number',
        isBucketed: false,
        references: [],
        params: {
          formula: 'col1 + col2',
          format: {
            id: 'number',
            params: {
              decimals: 2,
            },
          },
        },
      };

      const result = fromFormulaLensStateToAPI(input);
      expect(result.format).toEqual({
        type: 'number',
        decimals: 2,
      });
    });
  });
});
