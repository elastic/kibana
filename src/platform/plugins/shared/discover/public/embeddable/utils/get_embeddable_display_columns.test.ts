/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { createEsqlDataSource } from '../../../common/data_sources';
import { createProfileProviderSharedServicesMock } from '../../context_awareness/__mocks__';
import { createPatternsDataSourceProfileProvider } from '../../context_awareness/profile_providers/common/patterns_data_source_profile/profile';
import { SolutionType } from '../../context_awareness/profiles';
import { EMPTY_CONTEXT_AWARENESS_TOOLKIT } from '../../context_awareness/toolkit';
import { getEmbeddableDisplayColumns } from './get_embeddable_display_columns';

const categorizeResultColumnNames = ['Count', 'Sparkline', 'Pattern'];

const categorizeQuery =
  'FROM kibana_sample_data_logs | STATS Count = COUNT(*), Sparkline = SPARKLINE(COUNT(*), @timestamp) BY Pattern = CATEGORIZE(message)';

describe('getEmbeddableDisplayColumns', () => {
  it.each([
    {
      esql: 'FROM logs | STATS count = COUNT(*) BY Pattern = CATEGORIZE(message) | SORT count DESC',
      columns: ['count', 'Pattern'],
    },
    {
      esql: 'FROM logs | STATS total = COUNT(*), average = AVG(bytes) BY category = CATEGORIZE(message)',
      columns: ['total', 'average', 'category'],
    },
    {
      esql: `${categorizeQuery} | RENAME Count AS total, Sparkline AS trend`,
      columns: ['total', 'trend', 'Pattern'],
    },
    {
      esql: `${categorizeQuery} | KEEP Pattern, Count`,
      columns: ['Pattern', 'Count'],
    },
    {
      esql: `${categorizeQuery} | DROP Sparkline`,
      columns: ['Count', 'Pattern'],
    },
  ])('preserves result columns with the Patterns profile for $esql', async ({ esql, columns }) => {
    const provider = createPatternsDataSourceProfileProvider({
      ...createProfileProviderSharedServicesMock(),
      aiops: undefined,
    });
    const resolution = await provider.resolve({
      rootContext: { profileId: 'default-root-profile', solutionType: SolutionType.Default },
      dataSource: createEsqlDataSource(),
      query: { esql },
    });
    expect(resolution.isMatch).toBe(true);
    if (!resolution.isMatch) {
      throw new Error('Expected the Patterns profile to match');
    }
    const defaults = provider.profile.getDefaultAppState?.(() => ({}), {
      context: resolution.context,
      toolkit: EMPTY_CONTEXT_AWARENESS_TOOLKIT,
    })({ dataView: dataViewMock });

    expect(
      getEmbeddableDisplayColumns({
        autoApplyDiscoverColumnDefaults: true,
        persistedColumns: [],
        profileColumns: defaults?.columns,
        dataView: dataViewMock,
        isEsql: true,
        esql,
        esqlResultColumnNames: columns,
      })
    ).toEqual({ columns, grid: undefined });
  });

  it('preserves persisted columns when auto-apply is disabled', () => {
    expect(
      getEmbeddableDisplayColumns({
        autoApplyDiscoverColumnDefaults: false,
        persistedColumns: [],
        profileColumns: [
          { name: 'Count', width: 150 },
          { name: 'Sparkline', width: 150 },
          { name: 'Pattern' },
        ],
        dataView: dataViewMock,
        isEsql: true,
        esql: categorizeQuery,
        esqlResultColumnNames: categorizeResultColumnNames,
      })
    ).toEqual({ columns: [], grid: undefined });
  });

  it('preserves explicit persisted columns', () => {
    expect(
      getEmbeddableDisplayColumns({
        autoApplyDiscoverColumnDefaults: true,
        persistedColumns: ['message', 'host'],
        profileColumns: [{ name: 'Count' }, { name: 'Pattern' }],
        dataView: dataViewMock,
        isEsql: true,
        esql: categorizeQuery,
        esqlResultColumnNames: categorizeResultColumnNames,
      })
    ).toEqual({ columns: ['message', 'host'], grid: undefined });
  });

  it('keeps matching profile widths for persisted columns', () => {
    expect(
      getEmbeddableDisplayColumns({
        autoApplyDiscoverColumnDefaults: true,
        persistedColumns: ['Count', 'Sparkline', 'Pattern'],
        profileColumns: [
          { name: 'Count', width: 150 },
          { name: 'Sparkline', width: 150 },
          { name: 'Pattern' },
        ],
        dataView: dataViewMock,
        isEsql: true,
        esql: categorizeQuery,
        esqlResultColumnNames: categorizeResultColumnNames,
      })
    ).toEqual({
      columns: ['Count', 'Sparkline', 'Pattern'],
      grid: {
        columns: {
          Count: { width: 150 },
          Sparkline: { width: 150 },
        },
      },
    });
  });

  it('treats an explicit Summary column as authoritative', () => {
    expect(
      getEmbeddableDisplayColumns({
        autoApplyDiscoverColumnDefaults: true,
        persistedColumns: ['_source'],
        profileColumns: [{ name: 'Count' }, { name: 'Pattern' }],
        dataView: dataViewMock,
        isEsql: true,
        esql: categorizeQuery,
        esqlResultColumnNames: categorizeResultColumnNames,
      })
    ).toEqual({ columns: ['_source'], grid: undefined });
  });

  it('uses profile columns for empty CATEGORIZE sessions', () => {
    expect(
      getEmbeddableDisplayColumns({
        autoApplyDiscoverColumnDefaults: true,
        persistedColumns: [],
        profileColumns: [
          { name: 'Count', width: 150 },
          { name: 'Sparkline', width: 150 },
          { name: 'Pattern' },
        ],
        dataView: dataViewMock,
        isEsql: true,
        esql: categorizeQuery,
        esqlResultColumnNames: categorizeResultColumnNames,
      })
    ).toEqual({
      columns: ['Count', 'Sparkline', 'Pattern'],
      grid: {
        columns: {
          Count: { width: 150 },
          Sparkline: { width: 150 },
        },
      },
    });
  });

  it('uses guarded transformational ES|QL columns when the profile has no matching defaults', () => {
    expect(
      getEmbeddableDisplayColumns({
        autoApplyDiscoverColumnDefaults: true,
        persistedColumns: [],
        profileColumns: [{ name: 'message' }],
        dataView: dataViewMock,
        isEsql: true,
        esql: 'FROM logs | STATS count = COUNT(*) BY status',
        esqlResultColumnNames: ['count', 'status'],
      })
    ).toEqual({
      columns: ['count', 'status'],
      grid: undefined,
    });
  });

  it('does not expose every field of a wide non-transformational ES|QL response', () => {
    expect(
      getEmbeddableDisplayColumns({
        autoApplyDiscoverColumnDefaults: true,
        persistedColumns: [],
        dataView: dataViewMock,
        isEsql: true,
        esql: 'FROM logs | WHERE response == "404"',
        esqlResultColumnNames: ['a', 'b', 'c', 'd', 'e', 'f'],
      })
    ).toEqual({ columns: [], grid: undefined });
  });

  it('uses Summary for document queries when no profile matches', () => {
    expect(
      getEmbeddableDisplayColumns({
        autoApplyDiscoverColumnDefaults: true,
        persistedColumns: [],
        profileColumns: [{ name: 'message' }],
        dataView: dataViewMock,
        isEsql: true,
        esql: 'FROM logs | WHERE response == "404"',
        esqlResultColumnNames: ['a', 'b', 'c', 'd', 'default_column'],
      })
    ).toEqual({ columns: [], grid: undefined });
  });

  it('does not use a narrow document-query result set as default columns', () => {
    expect(
      getEmbeddableDisplayColumns({
        autoApplyDiscoverColumnDefaults: true,
        persistedColumns: [],
        dataView: dataViewMock,
        isEsql: true,
        esql: 'FROM logs | KEEP host, message, status',
        esqlResultColumnNames: ['host', 'message', 'status'],
      })
    ).toEqual({ columns: [], grid: undefined });
  });

  it('uses STATS result columns for mixed FORK aggregations', () => {
    expect(
      getEmbeddableDisplayColumns({
        autoApplyDiscoverColumnDefaults: true,
        persistedColumns: [],
        dataView: dataViewMock,
        isEsql: true,
        esql: 'FROM logs | FORK (WHERE x > 0) (STATS count = COUNT(*) BY status)',
        esqlResultColumnNames: ['count', 'status'],
      })
    ).toEqual({ columns: ['count', 'status'], grid: undefined });
  });

  it('does not treat STATS mentioned in a string as an aggregating query', () => {
    expect(
      getEmbeddableDisplayColumns({
        autoApplyDiscoverColumnDefaults: true,
        persistedColumns: [],
        dataView: dataViewMock,
        isEsql: true,
        esql: 'FROM logs | WHERE message == "STATS count"',
        esqlResultColumnNames: ['a', 'b', 'c', 'd', 'e', 'f'],
      })
    ).toEqual({ columns: [], grid: undefined });
  });

  it('keeps empty columns until ES|QL result columns are available', () => {
    expect(
      getEmbeddableDisplayColumns({
        autoApplyDiscoverColumnDefaults: true,
        persistedColumns: [],
        profileColumns: [{ name: 'Count' }],
        dataView: dataViewMock,
        isEsql: true,
        esql: categorizeQuery,
        esqlResultColumnNames: undefined,
      })
    ).toEqual({ columns: [], grid: undefined });
  });

  it('uses profile columns for empty non-ES|QL sessions', () => {
    expect(
      getEmbeddableDisplayColumns({
        autoApplyDiscoverColumnDefaults: true,
        persistedColumns: [],
        profileColumns: [{ name: 'message', width: 100 }, { name: 'extension' }],
        dataView: dataViewMock,
        isEsql: false,
        esqlResultColumnNames: undefined,
      })
    ).toEqual({
      columns: ['message', 'extension'],
      grid: {
        columns: {
          message: { width: 100 },
        },
      },
    });
  });
});
