/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import { DataSourceType } from '../../../../../common/data_sources';
import type { ContextWithProfileId } from '../../../profile_service';
import type { DataSourceProfileProviderParams, RootContext } from '../../../profiles';
import { DataSourceCategory, SolutionType } from '../../../profiles';
import { EMPTY_CONTEXT_AWARENESS_TOOLKIT } from '../../../toolkit';
import { CHANGE_POINT_DATA_SOURCE_PROFILE_ID } from './change_point_context';
import { createChangePointDataSourceProfileProvider } from './profile';

const RESOLUTION_MISMATCH = { isMatch: false };

describe('createChangePointDataSourceProfileProvider', () => {
  const ROOT_CONTEXT: ContextWithProfileId<RootContext> = {
    profileId: CHANGE_POINT_DATA_SOURCE_PROFILE_ID,
    solutionType: SolutionType.Default,
  };

  const createParams = (
    overrides: Partial<DataSourceProfileProviderParams>
  ): DataSourceProfileProviderParams => ({
    rootContext: ROOT_CONTEXT,
    dataSource: { type: DataSourceType.Esql },
    query: {
      esql: 'FROM logs-* | STATS avg_val = AVG(bytes) BY bucket = BUCKET(@timestamp, 1h) | CHANGE_POINT avg_val ON bucket',
    },
    ...overrides,
  });

  const provider = createChangePointDataSourceProfileProvider();

  describe('resolve', () => {
    describe('matches', () => {
      it('returns isMatch true with pvalueColumnId for a query with top-level CHANGE_POINT', async () => {
        const result = await provider.resolve(createParams({}));
        expect(result).toEqual({
          isMatch: true,
          context: {
            category: DataSourceCategory.Default,
            pvalueColumnId: 'pvalue',
          },
        });
      });

      it('picks up a custom pvalue AS alias', async () => {
        const result = await provider.resolve(
          createParams({
            query: {
              esql: 'FROM logs-* | STATS avg_val = AVG(bytes) BY bucket = BUCKET(@timestamp, 1h) | CHANGE_POINT avg_val ON bucket AS change_type, p_value',
            },
          })
        );
        expect(result).toEqual({
          isMatch: true,
          context: {
            category: DataSourceCategory.Default,
            pvalueColumnId: 'p_value',
          },
        });
      });

      it('context does not include typeColumnId', async () => {
        const result = await provider.resolve(createParams({}));
        expect(result.isMatch).toBe(true);
        if (result.isMatch) {
          expect(result.context).not.toHaveProperty('typeColumnId');
        }
      });
    });

    describe('does not match', () => {
      it('when data source is not ES|QL (DataView)', async () => {
        const result = await provider.resolve(
          createParams({ dataSource: { type: DataSourceType.DataView, dataViewId: 'logs' } })
        );
        expect(result).toEqual(RESOLUTION_MISMATCH);
      });

      it('when query is a non-aggregate KQL query', async () => {
        const result = await provider.resolve(
          createParams({ query: { language: 'kuery', query: 'message: error' } })
        );
        expect(result).toEqual(RESOLUTION_MISMATCH);
      });

      it('when ES|QL query has no CHANGE_POINT command', async () => {
        const result = await provider.resolve(
          createParams({ query: { esql: 'FROM logs-* | STATS count = COUNT(*)' } })
        );
        expect(result).toEqual(RESOLUTION_MISMATCH);
      });

      it('when CHANGE_POINT is only inside a FORK branch (not top-level)', async () => {
        const result = await provider.resolve(
          createParams({
            query: {
              esql: 'FROM logs-* | FORK (STATS avg = AVG(bytes) BY bucket = BUCKET(@timestamp, 1h) | CHANGE_POINT avg ON bucket)',
            },
          })
        );
        expect(result).toEqual(RESOLUTION_MISMATCH);
      });
    });
  });

  describe('getChartSectionConfiguration', () => {
    it('returns replaceDefaultChart: true and a renderChartSection function', () => {
      const context = {
        category: DataSourceCategory.Default,
        pvalueColumnId: 'pvalue',
      };
      const getConfig = provider.profile.getChartSectionConfiguration!(
        () => ({ replaceDefaultChart: false }),
        {
          context,
          toolkit: EMPTY_CONTEXT_AWARENESS_TOOLKIT,
        }
      );
      const config = getConfig();
      expect(config.replaceDefaultChart).toBe(true);
      if (config.replaceDefaultChart) {
        expect(typeof config.renderChartSection).toBe('function');
      }
    });
  });

  describe('getColumnsConfiguration', () => {
    it('customises the pvalue column when pvalueColumnId is present', () => {
      const context = {
        category: DataSourceCategory.Default,
        pvalueColumnId: 'my_pvalue',
      };
      const getColumns = provider.profile.getColumnsConfiguration!(() => ({}), {
        context,
        toolkit: EMPTY_CONTEXT_AWARENESS_TOOLKIT,
      });
      const columns = getColumns();
      expect(columns).toHaveProperty('my_pvalue');
    });

    it('returns base config when pvalueColumnId is absent', () => {
      const base = { existing: {} as never };
      const getColumns = provider.profile.getColumnsConfiguration!(() => base, {
        context: { category: DataSourceCategory.Default, pvalueColumnId: '' },
        toolkit: EMPTY_CONTEXT_AWARENESS_TOOLKIT,
      });
      const columns = getColumns();
      expect(columns).toBe(base);
    });
  });

  describe('getCellRenderers', () => {
    const buildRenderers = (pvalueColumnId: string) => {
      const getCellRenderers = provider.profile.getCellRenderers!(() => ({}), {
        context: { category: DataSourceCategory.Default, pvalueColumnId },
        toolkit: EMPTY_CONTEXT_AWARENESS_TOOLKIT,
      });
      return getCellRenderers({
        rowHeight: 1,
        dataView: {} as DataView,
        density: undefined,
      });
    };

    it('registers a renderer for the pvalue column', () => {
      const renderers = buildRenderers('pvalue');
      expect(renderers).toHaveProperty('pvalue');
    });

    it('registered renderer is a function', () => {
      const renderers = buildRenderers('pvalue');
      expect(renderers.pvalue).toBeInstanceOf(Function);
    });

    it('falls through to prev when pvalueColumnId is empty', () => {
      const existingRenderer = jest.fn();
      const prevRenderers = { some_col: existingRenderer };
      const getCellRenderers = provider.profile.getCellRenderers!(() => prevRenderers, {
        context: { category: DataSourceCategory.Default, pvalueColumnId: '' },
        toolkit: EMPTY_CONTEXT_AWARENESS_TOOLKIT,
      });
      const renderers = getCellRenderers({
        rowHeight: 1,
        dataView: {} as DataView,
        density: undefined,
      });
      expect(renderers).toBe(prevRenderers);
    });
  });
});
