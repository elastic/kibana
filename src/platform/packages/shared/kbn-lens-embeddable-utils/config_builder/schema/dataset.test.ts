/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Datatable } from '@kbn/expressions-plugin/common';
import { datasetSchema, datasetTypeSchema, datasetEsqlTableTypeSchema } from './dataset';

describe('Dataset Schema', () => {
  describe('dataView type', () => {
    it('validates a valid dataView configuration', () => {
      const input = {
        type: 'dataView' as const,
        id: 'my-data-view',
      };

      const validated = datasetTypeSchema.validate(input);
      expect(validated).toEqual(input);
    });

    it('throws on missing name', () => {
      const input = {
        type: 'dataView' as const,
      };

      expect(() => datasetTypeSchema.validate(input)).toThrow(/\[0.id\]: expected value of type/);
    });
  });

  describe('index type', () => {
    it('validates a valid index configuration', () => {
      const input = {
        type: 'index' as const,
        index: 'my-index-*',
        time_field: '@timestamp',
      };

      const validated = datasetTypeSchema.validate(input);
      expect(validated).toEqual(input);
    });

    it('validates index configuration with runtime fields', () => {
      const input = {
        type: 'index' as const,
        index: 'my-index-*',
        time_field: '@timestamp',
        runtime_fields: [
          {
            type: 'keyword',
            name: 'my_runtime_field',
            format: { id: 'string' },
          },
          {
            type: 'long',
            name: 'another_field',
          },
        ],
      };

      const validated = datasetTypeSchema.validate(input);
      expect(validated).toEqual(input);
    });

    it('throws on missing required fields', () => {
      const input = {
        type: 'index' as const,
        time_field: '@timestamp',
      };

      expect(() => datasetTypeSchema.validate(input)).toThrow(
        /\[1.index\]: expected value of type/
      );
    });
  });

  describe('esql type', () => {
    it('validates a valid esql configuration', () => {
      const input = {
        type: 'esql' as const,
        query: 'FROM my-index | LIMIT 100',
      };

      const validated = datasetEsqlTableTypeSchema.validate(input);
      expect(validated).toEqual(input);
    });

    it('throws on missing query', () => {
      const input = {
        type: 'esql' as const,
      };

      expect(() => datasetEsqlTableTypeSchema.validate(input)).toThrow(
        /\[0.query\]: expected value of type/
      );
    });
  });

  describe('table type', () => {
    it('validates a valid table configuration', () => {
      const mockTable: Datatable = {
        type: 'datatable',
        columns: [{ id: 'col1', name: 'Column 1', meta: { type: 'string' } }],
        rows: [{ col1: 'value1' }],
      };

      const input = {
        type: 'table' as const,
        table: mockTable,
      };

      const validated = datasetEsqlTableTypeSchema.validate(input);
      expect(validated).toEqual(input);
    });

    it('throws on missing table', () => {
      const input = {
        type: 'table' as const,
      };

      expect(() => datasetEsqlTableTypeSchema.validate(input)).toThrow(
        /\[1.table\]: expected value of type/
      );
    });
  });

  describe('dataset schema wrapper', () => {
    it('validates dataset property with valid configuration', () => {
      const input = {
        dataset: {
          type: 'dataView' as const,
          id: 'my-data-view',
        },
      };

      const validated = datasetSchema.dataset.validate(input.dataset);
      expect(validated).toEqual(input.dataset);
    });

    it('throws on invalid dataset type', () => {
      const input = {
        dataset: {
          type: 'invalid' as const,
          id: 'my-data-view',
        },
      };

      expect(() => datasetSchema.dataset.validate(input.dataset)).toThrow();
    });
  });

  describe('edge cases', () => {
    it('validates index configuration with empty runtime fields array', () => {
      const input = {
        type: 'index' as const,
        index: 'my-index-*',
        time_field: '@timestamp',
        runtime_fields: [],
      };

      const validated = datasetTypeSchema.validate(input);
      expect(validated).toEqual(input);
    });

    it('validates runtime fields with various format configurations', () => {
      const input = {
        type: 'index' as const,
        index: 'my-index-*',
        time_field: '@timestamp',
        runtime_fields: [
          {
            type: 'date',
            name: 'date_field',
            format: { pattern: 'YYYY-MM-DD' },
          },
          {
            type: 'number',
            name: 'number_field',
            format: { decimals: 2 },
          },
        ],
      };

      const validated = datasetTypeSchema.validate(input);
      expect(validated).toEqual(input);
    });
  });
});
