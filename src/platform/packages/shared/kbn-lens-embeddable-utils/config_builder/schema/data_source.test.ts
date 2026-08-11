/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expectPrettyError } from '@kbn/zod-helpers/v4';
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

      const validated = dataViewSchema.parse(input);
      expect(validated).toEqual(input);
    });

    it('throws on missing name', () => {
      const input = {
        type: AS_CODE_DATA_VIEW_REFERENCE_TYPE,
        // @ts-expect-error - ignore required name for test purposes
      } satisfies DataSourceTypeNoESQL;

      const result = dataViewSchema.safeParse(input);
      expectPrettyError(result).toMatchInlineSnapshot(`
        "✖ Invalid input: expected string, received undefined
          → at ref_id"
      `);
    });
  });

  describe('index type', () => {
    it('validates a valid index configuration', () => {
      const input = {
        type: AS_CODE_DATA_VIEW_SPEC_TYPE,
        index_pattern: 'my-index-*',
        time_field: '@timestamp',
      } satisfies DataSourceTypeNoESQL;

      const validated = dataViewSchema.parse(input);
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

      const validated = dataViewSchema.parse(input);
      expect(validated).toEqual(input);
    });

    it('throws on missing required fields', () => {
      const input = {
        type: AS_CODE_DATA_VIEW_SPEC_TYPE,
        time_field: '@timestamp',
        // @ts-expect-error - ignore required fields for test purposes
      } satisfies DataSourceTypeNoESQL;

      const result = dataViewSchema.safeParse(input);
      expectPrettyError(result).toMatchInlineSnapshot(`
        "✖ Invalid input: expected string, received undefined
          → at index_pattern"
      `);
    });
  });

  describe('esql type', () => {
    it('validates a valid esql configuration', () => {
      const input = {
        type: 'esql',
        query: 'FROM my-index | LIMIT 100',
      } satisfies DataSourceTypeESQL;

      const validated = esqlDataSourceSchema.parse(input);
      expect(validated).toEqual(input);
    });

    it('throws on missing query', () => {
      const input = {
        type: 'esql',
        // @ts-expect-error - ignore query prop for test purposes
      } satisfies DataSourceTypeESQL;

      const result = esqlDataSourceSchema.safeParse(input);
      expectPrettyError(result).toMatchInlineSnapshot(`
        "✖ Invalid input: expected string, received undefined
          → at query"
      `);
    });
  });

  describe('DataSource schema wrapper', () => {
    it('validates datasource property with valid configuration', () => {
      const input = {
        type: AS_CODE_DATA_VIEW_REFERENCE_TYPE,
        ref_id: 'my-data-view',
      } satisfies DataSourceTypeNoESQL;

      const validated = dataSourceSchema.shape.data_source.parse(input);
      expect(validated).toEqual(input);
    });

    it('throws on invalid datasource type', () => {
      const input = {
        type: 'invalid',
        id: 'my-data-view',
      };

      const result = dataSourceSchema.shape.data_source.safeParse(input);
      expectPrettyError(result).toMatchInlineSnapshot(`
        "✖ Invalid discriminator value. Expected 'data_view_reference' | 'data_view_spec'
          → at type"
      `);
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

      const validated = dataViewSchema.parse(input);
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

      const validated = dataViewSchema.parse(input);
      expect(validated).toEqual(input);
    });
  });
});
