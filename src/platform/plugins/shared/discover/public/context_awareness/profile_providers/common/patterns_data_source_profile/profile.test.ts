/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  CustomGridColumnsConfiguration,
  UnifiedDataTableProps,
} from '@kbn/unified-data-table';
import { createMockEsqlSource } from '@kbn/data-source/src/__mocks__/esql_source.mock';
import { EsqlSource } from '@kbn/data-source';
import { mapEsqlResponseToDatatable } from '@kbn/data-plugin/common';
import { createProfileProviderSharedServicesMock } from '../../../__mocks__';
import { DataSourceCategory, SolutionType } from '../../../profiles';
import { createEsqlDataSource } from '../../../../../common/data_sources';
import { EMPTY_CONTEXT_AWARENESS_TOOLKIT } from '../../../toolkit';
import { createPatternsDataSourceProfileProvider } from './profile';
import { onResizeGridColumn } from '../../../../utils/on_resize_grid_column';

const dataSource = createMockEsqlSource([
  { name: 'events', type: 'number', source: 'esql-result' },
  { name: 'average', type: 'number', source: 'esql-result' },
  { name: 'Pattern', type: 'string', source: 'esql-result' },
]);
const getConfiguration = (
  columns = ['events', 'average', 'Pattern'],
  settings?: UnifiedDataTableProps['settings'],
  previous: CustomGridColumnsConfiguration = {}
) => {
  const provider = createPatternsDataSourceProfileProvider(
    createProfileProviderSharedServicesMock()
  );
  const accessor = provider.profile.getColumnsConfiguration;
  if (!accessor) {
    throw new Error('Expected column configuration');
  }
  return accessor(() => previous, {
    context: {
      category: DataSourceCategory.Default,
      patternColumns: ['Pattern'],
      sparklineColumns: [],
    },
    toolkit: EMPTY_CONTEXT_AWARENESS_TOOLKIT,
  })({ columns, settings, dataSource });
};

describe('Patterns numeric column widths', () => {
  it('compacts an aliased SPARKLINE column after mapping the fetched response', async () => {
    const query =
      'FROM logs-sparkline-width | STATS trend = SPARKLINE(COUNT(*), @timestamp, 3, "2026-01-01T00:00:00Z", "2026-01-04T00:00:00Z") BY category = CATEGORIZE(message)';
    const provider = createPatternsDataSourceProfileProvider({
      ...createProfileProviderSharedServicesMock(),
      aiops: undefined,
    });
    const resolution = await provider.resolve({
      rootContext: { profileId: 'default-root-profile', solutionType: SolutionType.Default },
      dataSource: createEsqlDataSource(),
      query: { esql: query },
    });
    const accessor = provider.profile.getColumnsConfiguration;
    if (!resolution.isMatch || !accessor) {
      throw new Error('Expected Patterns profile');
    }
    expect(resolution.context.sparklineColumns).toEqual(['trend']);

    const datatable = mapEsqlResponseToDatatable(
      {
        columns: [
          { name: 'trend', type: 'double' },
          { name: 'category', type: 'keyword' },
        ],
        values: [[[2, 5, 3], 'Connected to .*']],
      },
      { query }
    );
    const source = await EsqlSource.create({ query, resolveTimeField: false });
    const fetchedSource = source.withColumns(datatable.columns);
    expect(fetchedSource.getColumn('trend')).toMatchObject({ type: 'number', esType: 'double' });

    const configuration = accessor(() => ({}), {
      context: resolution.context,
      toolkit: EMPTY_CONTEXT_AWARENESS_TOOLKIT,
    })({ columns: datatable.columns.map(({ name }) => name), dataSource: fetchedSource });
    expect(configuration.trend({ column: { id: 'trend' } }).initialWidth).toBe(150);
    expect(configuration.category).toBeUndefined();
  });

  it('does not compact numbers when the pattern alias was overwritten with a number', async () => {
    const provider = createPatternsDataSourceProfileProvider({
      ...createProfileProviderSharedServicesMock(),
      aiops: undefined,
    });
    const resolution = await provider.resolve({
      rootContext: { profileId: 'default-root-profile', solutionType: SolutionType.Default },
      dataSource: createEsqlDataSource(),
      query: {
        esql: 'FROM logs | STATS total = COUNT(*) BY Pattern = CATEGORIZE(message) | EVAL Pattern = 1',
      },
    });
    const accessor = provider.profile.getColumnsConfiguration;
    if (!resolution.isMatch || !accessor) {
      throw new Error('Expected Patterns profile');
    }
    expect(
      accessor(() => ({}), {
        context: resolution.context,
        toolkit: EMPTY_CONTEXT_AWARENESS_TOOLKIT,
      })({
        columns: ['total', 'Pattern'],
        dataSource: createMockEsqlSource([
          { name: 'total', type: 'number', source: 'esql-result' },
          { name: 'Pattern', type: 'number', source: 'esql-result' },
        ]),
      })
    ).toEqual({});
  });

  it('uses response types to compact arbitrary numeric aliases and leaves the pattern flexible', () => {
    const configuration = getConfiguration();
    expect(Object.keys(configuration)).toEqual(['events', 'average']);
    expect(configuration.events({ column: { id: 'events' } }).initialWidth).toBe(150);
    expect(configuration.average({ column: { id: 'average' } }).initialWidth).toBe(150);
  });

  it('returns to automatic sizing when the pattern is removed', () => {
    expect(getConfiguration(['events'])).toEqual({});
    expect(getConfiguration(['events', 'average'])).toEqual({});
  });

  it('leaves numeric columns flexible when the pattern has a saved width', () => {
    expect(getConfiguration(undefined, { columns: { Pattern: { width: 300 } } })).toEqual({});
  });

  it('preserves a resized width and uses automatic sizing after reset', () => {
    const resizedSettings = onResizeGridColumn({ columnId: 'events', width: 280 }, undefined);
    expect(getConfiguration(undefined, resizedSettings).events).toBeUndefined();

    const resetSettings = onResizeGridColumn(
      { columnId: 'events', width: undefined },
      resizedSettings
    );
    const configuration = getConfiguration(undefined, resetSettings);
    expect(configuration.events).toBeUndefined();
    expect(configuration.average({ column: { id: 'average' } }).initialWidth).toBe(150);
    expect(configuration.Pattern).toBeUndefined();
    expect(getConfiguration(['events'], resetSettings)).toEqual({});
  });

  it('preserves existing column customizations and widths', () => {
    const configuration = getConfiguration(undefined, undefined, {
      events: ({ column }) => ({ ...column, initialWidth: 240, displayAsText: 'Events' }),
    });
    expect(configuration.events({ column: { id: 'events' } })).toEqual({
      id: 'events',
      initialWidth: 240,
      displayAsText: 'Events',
    });
  });
});
