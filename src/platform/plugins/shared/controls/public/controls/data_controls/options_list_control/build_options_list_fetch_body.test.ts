/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ControlValuesSource } from '@kbn/controls-constants';
import type { FilterableField, FilterableSource } from '@kbn/data-source';
import type { FetchContext } from '@kbn/presentation-publishing';
import { buildOptionsListFetchBody } from './build_options_list_fetch_body';

describe('buildOptionsListFetchBody', () => {
  const field: FilterableField = { name: 'host', type: 'string', aggregatable: true };
  // The source of an ES|QL dataset: its fields and title, with no data view behind it.
  const esqlSource: FilterableSource = {
    kind: 'esql',
    id: 'esql-dataset-id',
    title: 'logs-*',
    fields: [field],
    getFieldByName: () => field,
    isTimeBased: () => false,
  };
  // What a data view gives to the request: its title, the spec of its fields and its runtime fields.
  const fieldSpec = { name: 'host', type: 'string', searchable: true, aggregatable: true };
  const runtimeFieldMap = { day: { type: 'keyword' as const } };
  const dataViewSource: FilterableSource = {
    id: 'data-view-id',
    title: 'metrics-*',
    fields: [],
    getFieldByName: () => undefined,
    toSpec: () => ({ runtimeFieldMap }),
    isTimeBased: () => false,
  };
  const dataViewField: FilterableField = { ...field, toSpec: () => fieldSpec };
  const mainframeFilter = {
    meta: { type: 'phrase', key: 'host', params: { query: 'mainframe' } },
    query: { match_phrase: { host: 'mainframe' } },
  };

  const build = (
    dataSource: FilterableSource,
    sourceField: FilterableField,
    overrides: Partial<Parameters<typeof buildOptionsListFetchBody>[0]> = {}
  ) =>
    buildOptionsListFetchBody({
      valuesSource: ControlValuesSource.FIELD,
      dataSources: [dataSource],
      field: sourceField,
      fetchContext: {
        isReload: false,
        projectRouting: '_alias:*',
        filters: [mainframeFilter],
      } as unknown as FetchContext,
      useGlobalFilters: true,
      searchString: 'ma',
      sort: { by: '_key', direction: 'asc' },
      searchTechnique: 'prefix',
      requestSize: 10,
      runPastTimeout: false,
      selectedOptions: ['web-01'],
      ignoreValidations: false,
      ...overrides,
    });

  describe('field of an ES|QL source', () => {
    it('asks the FROM target of the source with an ES|QL query run from the browser', () => {
      const result = build(esqlSource, field);

      expect(result).toMatchObject({
        outcome: 'fetch',
        body: {
          kind: 'esql-source',
          fieldName: 'host',
          esql: 'FROM logs-* | STATS BY host',
          sort: { by: '_key', direction: 'asc' },
          selectedOptions: ['web-01'],
          ignoreValidations: false,
          projectRouting: '_alias:*',
        },
      });
    });

    it('filters the query with both the dashboard filters and the search of the control', () => {
      const result = build(esqlSource, field);

      expect(result).toMatchObject({
        body: {
          filter: {
            bool: {
              filter: [
                { bool: { filter: [{ match_phrase: { host: 'mainframe' } }] } },
                { prefix: { host: { value: 'ma', case_insensitive: true } } },
              ],
            },
          },
        },
      });
    });

    it('has only the dashboard filters when there is nothing to search', () => {
      const result = build(esqlSource, field, { searchString: '' });

      expect(result.outcome === 'fetch' && JSON.stringify(result.body)).not.toContain('prefix');
    });

    it('has nothing to fetch when the search is not valid for the type of the field', () => {
      const result = build(esqlSource, { ...field, type: 'number' }, { searchString: 'abc' });

      expect(result).toEqual({
        outcome: 'empty',
        response: { suggestions: [], totalCardinality: 0 },
      });
    });
  });

  describe('field of a data view', () => {
    it('asks the title of the data view with its field spec and runtime fields', () => {
      const result = build(dataViewSource, dataViewField);

      expect(result).toMatchObject({
        outcome: 'fetch',
        body: {
          kind: 'dsl',
          index: 'metrics-*',
          fieldName: 'host',
          fieldSpec,
          runtimeFieldMap,
          size: 10,
          selectedOptions: ['web-01'],
          projectRouting: '_alias:*',
        },
      });
      expect(result.outcome === 'fetch' && JSON.stringify(result.body)).toContain('mainframe');
    });

    it('has nothing to fetch when the search is not valid for the type of the field', () => {
      const result = build(
        dataViewSource,
        { ...dataViewField, type: 'number' },
        { searchString: 'abc' }
      );

      expect(result).toEqual({
        outcome: 'empty',
        response: { suggestions: [], totalCardinality: 0 },
      });
    });
  });
});
