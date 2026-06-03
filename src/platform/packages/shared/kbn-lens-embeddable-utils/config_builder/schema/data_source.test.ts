/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataSourceTypeESQL, DataSourceTypeNoESQL } from './data_source';
import { dataSourceSchema } from './data_source';
import {
  AS_CODE_DATA_VIEW_REFERENCE_TYPE,
  AS_CODE_DATA_VIEW_SPEC_TYPE,
  dataViewSchema,
  esqlDataSourceSchema,
} from '@kbn/as-code-data-views-schema';

describe('DataSource Schema', () => {
  describe('DataViewReference type', () => {
    it('validates a valid dataView configuration', () => {
      const input = {
        type: AS_CODE_DATA_VIEW_REFERENCE_TYPE,
        ref_id: 'my-data-view',
      } satisfies DataSourceTypeNoESQL;

      const validated = dataViewSchema.validate(input);
      expect(validated).toEqual(input);
    });

    it('throws on missing name', () => {
      const input = {
        type: AS_CODE_DATA_VIEW_REFERENCE_TYPE,
        // @ts-expect-error - ignore required name for test purposes
      } satisfies DataSourceTypeNoESQL;

      expect(() => dataViewSchema.validate(input)).toThrow(
        `[ref_id]: expected value of type [string] but got [undefined]`
      );
    });
  });

  describe('index type', () => {
    it('validates a valid index configuration', () => {
      const input = {
        type: AS_CODE_DATA_VIEW_SPEC_TYPE,
        index_pattern: 'my-index-*',
        time_field: '@timestamp',
      } satisfies DataSourceTypeNoESQL;

      const validated = dataViewSchema.validate(input);
      expect(validated).toEqual(input);
    });

    it('validates index configuration with runtime fields', () => {
      const input = {
        type: AS_CODE_DATA_VIEW_SPEC_TYPE,
        index_pattern: 'my-index-*',
        time_field: '@timestamp',
        field_settings: {
          my_runtime_field: {
            type: 'keyword',
            format: { type: 'string', params: { id: 'string' } },
          },
          another_field: {
            type: 'long',
          },
        },
      } satisfies DataSourceTypeNoESQL;

      const validated = dataViewSchema.validate(input);
      expect(validated).toEqual(input);
    });

    it('throws on missing required fields', () => {
      const input = {
        type: AS_CODE_DATA_VIEW_SPEC_TYPE,
        time_field: '@timestamp',
        // @ts-expect-error - ignore required fields for test purposes
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

      const validated = esqlDataSourceSchema.validate(input);
      expect(validated).toEqual(input);
    });

    it('throws on missing query', () => {
      const input = {
        type: 'esql',
        // @ts-expect-error - ignore query prop for test purposes
      } satisfies DataSourceTypeESQL;

      expect(() => esqlDataSourceSchema.validate(input)).toThrow(
        /\[query\]: expected value of type/
      );
    });
  });

  describe('DataSource schema wrapper', () => {
    it('validates datasource property with valid configuration', () => {
      const input = {
        type: AS_CODE_DATA_VIEW_REFERENCE_TYPE,
        ref_id: 'my-data-view',
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
    it('validates index configuration with empty field_settings object', () => {
      const input = {
        type: AS_CODE_DATA_VIEW_SPEC_TYPE,
        index_pattern: 'my-index-*',
        time_field: '@timestamp',
        field_settings: {},
      } satisfies DataSourceTypeNoESQL;

      const validated = dataViewSchema.validate(input);
      expect(validated).toEqual(input);
    });

    it('validates runtime fields with various format configurations', () => {
      const input = {
        type: AS_CODE_DATA_VIEW_SPEC_TYPE,
        index_pattern: 'my-index-*',
        time_field: '@timestamp',
        field_settings: {
          date_field: {
            type: 'date',
            format: {
              type: 'date',
              params: {
                pattern: 'YYYY-MM-DD',
              },
            },
          },
          number_field: {
            type: 'double',
            format: { type: '', params: { decimals: 2 } },
          },
        },
      } satisfies DataSourceTypeNoESQL;

      const validated = dataViewSchema.validate(input);
      expect(validated).toEqual(input);
    });
  });
});
