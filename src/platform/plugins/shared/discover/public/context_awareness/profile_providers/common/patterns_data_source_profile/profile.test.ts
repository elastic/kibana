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
import { createProfileProviderSharedServicesMock } from '../../../__mocks__';
import { DataSourceCategory } from '../../../profiles';
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

  it('preserves a resized width and restores the compact default after reset', () => {
    const resizedSettings = onResizeGridColumn({ columnId: 'events', width: 280 }, undefined);
    expect(getConfiguration(undefined, resizedSettings).events).toBeUndefined();

    const resetSettings = onResizeGridColumn(
      { columnId: 'events', width: undefined },
      resizedSettings
    );
    const configuration = getConfiguration(undefined, resetSettings);
    expect(configuration.events({ column: { id: 'events' } }).initialWidth).toBe(150);
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
