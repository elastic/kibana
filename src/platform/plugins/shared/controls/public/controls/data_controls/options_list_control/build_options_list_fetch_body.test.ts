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

  describe('ES|QL', () => {
    const esqlRequest = {
      kind: 'esql',
      sort: { by: '_key', direction: 'asc' },
      searchString: 'ma',
      searchTechnique: 'prefix',
      selectedOptions: ['web-01'],
      ignoreValidations: false,
      projectRouting: '_alias:*',
    };

    it('asks the FROM target of an ES|QL source with a query on the field', () => {
      expect(build(esqlSource, field)).toMatchObject({
        outcome: 'fetch',
        body: { ...esqlRequest, esql: 'FROM logs-* | STATS BY host' },
      });
    });

    it('asks the query that the user writes, with the same request as for an ES|QL source', () => {
      const result = build(dataViewSource, dataViewField, {
        valuesSource: ControlValuesSource.ESQL,
        esqlQuery: 'FROM logs-* | STATS BY host',
      });

      expect(result).toEqual(build(esqlSource, field));
    });

    it('pre-filters the query with the dashboard filters, and leaves the search to the values', () => {
      const result = build(esqlSource, field);

      expect(result).toMatchObject({
        body: { filter: { bool: { filter: [{ match_phrase: { host: 'mainframe' } }] } } },
      });
      expect(
        result.outcome === 'fetch' &&
          result.body.kind === 'esql' &&
          JSON.stringify(result.body.filter)
      ).not.toContain('prefix');
    });

    it('has nothing to fetch without the query of the user, or the field of an ES|QL source', () => {
      const empty = { outcome: 'empty', response: { suggestions: [] } };

      expect(
        build(dataViewSource, dataViewField, { valuesSource: ControlValuesSource.ESQL })
      ).toEqual(empty);
      expect(build(esqlSource, undefined as unknown as FilterableField)).toEqual(empty);
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
