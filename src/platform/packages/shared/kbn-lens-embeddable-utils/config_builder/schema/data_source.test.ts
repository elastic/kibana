/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Datatable } from '@kbn/expressions-plugin/common';
import type { DataSourceTypeESQL, DataSourceTypeNoESQL } from './data_source';
import { dataSourceSchema, dataSourceEsqlTableTypeSchema } from './data_source';
import { dataViewSchema } from '@kbn/as-code-data-views-schema';

describe('DataSource Schema', () => {
  describe('DataViewReference type', () => {
    it('validates a valid dataView configuration', () => {
      const input = {
        type: 'data_view_reference',
        id: 'my-data-view',
      } satisfies DataSourceTypeNoESQL;

      const validated = dataViewSchema.validate(input);
      expect(validated).toEqual(input);
    });

    it('throws on missing name', () => {
      const input = {
        type: 'data_view_reference',
        // @ts-expect-error
      } satisfies DataSourceTypeNoESQL;

      expect(() => dataViewSchema.validate(input)).toThrow(
        `[id]: expected value of type [string] but got [undefined]`
      );
    });
  });

  describe('index type', () => {
    it('validates a valid index configuration', () => {
      const input = {
        type: 'data_view_spec',
        index_pattern: 'my-index-*',
        time_field: '@timestamp',
      } satisfies DataSourceTypeNoESQL;

      const validated = dataViewSchema.validate(input);
      expect(validated).toEqual(input);
    });

    it('validates index configuration with runtime fields', () => {
      const input = {
        type: 'data_view_spec',
        index_pattern: 'my-index-*',
        time_field: '@timestamp',
        runtime_fields: [
          {
            type: 'keyword',
            name: 'my_runtime_field',
            format: { type: 'string', params: { id: 'string' } },
          },
          {
            type: 'long',
            name: 'another_field',
          },
        ],
      } satisfies DataSourceTypeNoESQL;

      const validated = dataViewSchema.validate(input);
      expect(validated).toEqual(input);
    });

    it('throws on missing required fields', () => {
      const input = {
        type: 'data_view_spec',
        time_field: '@timestamp',
        // @ts-expect-error
      } satisfies DataSourceTypeNoESQL;

      expect(() => dataViewSchema.validate(input)).toThrow(
        '[index_pattern]: expected value of type [string] but got [undefined]'
      );
    });
  });

  describe('esql type', () => {
    it('validates a valid esql configuration', () => {
      const input = {
        type: 'esql',
        query: 'FROM my-index | LIMIT 100',
      } satisfies DataSourceTypeESQL;

      const validated = dataSourceEsqlTableTypeSchema.validate(input);
      expect(validated).toEqual(input);
    });

    it('throws on missing query', () => {
      const input = {
        type: 'esql',
        // @ts-expect-error
      } satisfies DataSourceTypeESQL;

      expect(() => dataSourceEsqlTableTypeSchema.validate(input)).toThrow(
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
        type: 'table',
        table: mockTable,
      } satisfies DataSourceTypeESQL;

      const validated = dataSourceEsqlTableTypeSchema.validate(input);
      expect(validated).toEqual(input);
    });

    it('throws on missing table', () => {
      const input = {
        type: 'table' as const,
      };

      expect(() => dataSourceEsqlTableTypeSchema.validate(input)).toThrow(
        /\[1.table\]: expected value of type/
      );
    });
  });

  describe('DataSource schema wrapper', () => {
    it('validates datasource property with valid configuration', () => {
      const input = {
        type: 'data_view_reference',
        id: 'my-data-view',
      } satisfies DataSourceTypeNoESQL;

      const validated = dataSourceSchema.data_source.validate(input);
      expect(validated).toEqual(input);
    });

    it('throws on invalid datasource type', () => {
      const input = {
        type: 'invalid',
        id: 'my-data-view',
      };

      expect(() => dataSourceSchema.data_source.validate(input)).toThrow();
    });
  });

  describe('edge cases', () => {
    it('validates index configuration with empty runtime fields array', () => {
      const input = {
        type: 'data_view_spec',
        index_pattern: 'my-index-*',
        time_field: '@timestamp',
        runtime_fields: [],
      } satisfies DataSourceTypeNoESQL;

      const validated = dataViewSchema.validate(input);
      expect(validated).toEqual(input);
    });

    it('validates runtime fields with various format configurations', () => {
      const input = {
        type: 'data_view_spec',
        index_pattern: 'my-index-*',
        time_field: '@timestamp',
        runtime_fields: [
          {
            type: 'date',
            name: 'date_field',
            format: {
              type: 'date',
              params: {
                pattern: 'YYYY-MM-DD',
              },
            },
          },
          {
            type: 'double',
            name: 'number_field',
            format: { type: '', params: { decimals: 2 } },
          },
        ],
      } satisfies DataSourceTypeNoESQL;

      const validated = dataViewSchema.validate(input);
      expect(validated).toEqual(input);
    });
  });
});
