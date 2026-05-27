/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import { DataSourceType } from '../../../../../common/data_sources';
import type { ContextWithProfileId } from '../../../profile_service';
import type { DataSourceProfileProviderParams, RootContext } from '../../../profiles';
import { DataSourceCategory, SolutionType } from '../../../profiles';
import type { ProfileProviderServices } from '../../profile_provider_services';
import {
  SPARKLINE_DATA_SOURCE_PROFILE_ID,
  createSparklineDataSourceProfileProvider,
  type SparklineDataSourceProfileProvider,
} from './profile';

const RESOLUTION_MISMATCH = { isMatch: false };

describe('sparklineDataSourceProfileProvider', () => {
  const ROOT_CONTEXT: ContextWithProfileId<RootContext> = {
    profileId: SPARKLINE_DATA_SOURCE_PROFILE_ID,
    solutionType: SolutionType.Default,
  };

  const createParams = (
    overrides: Partial<DataSourceProfileProviderParams>
  ): DataSourceProfileProviderParams => ({
    rootContext: ROOT_CONTEXT,
    dataSource: { type: DataSourceType.Esql },
    query: { esql: 'FROM logs-* | STATS my_spark = SPARKLINE(bytes)' },
    ...overrides,
  });

  const mockServices = {
    charts: {} as ChartsPluginStart,
  } as unknown as ProfileProviderServices;

  let provider: SparklineDataSourceProfileProvider;

  beforeEach(() => {
    provider = createSparklineDataSourceProfileProvider(mockServices);
  });

  describe('resolve', () => {
    describe('matches', () => {
      it('when query has a named SPARKLINE column', async () => {
        const result = await provider.resolve(createParams({}));
        expect(result).toEqual({
          isMatch: true,
          context: {
            category: DataSourceCategory.Default,
            sparklineColumns: ['my_spark'],
          },
        });
      });

      it('when query has multiple SPARKLINE columns', async () => {
        const result = await provider.resolve(
          createParams({
            query: {
              esql: 'FROM logs-* | STATS bytes_spark = SPARKLINE(bytes), req_spark = SPARKLINE(requests)',
            },
          })
        );
        expect(result).toEqual({
          isMatch: true,
          context: {
            category: DataSourceCategory.Default,
            sparklineColumns: ['bytes_spark', 'req_spark'],
          },
        });
      });

      it('when query uses a SPARKLINE column with an aggregate inline WHERE filter', async () => {
        const result = await provider.resolve(
          createParams({
            query: {
              esql: 'FROM employees | STATS sparkline = SPARKLINE(COUNT(*), hire_date, 20, "1985-01-01T00:00:00Z", "1985-12-31T00:00:00Z") WHERE gender == "M"',
            },
          })
        );
        expect(result).toEqual({
          isMatch: true,
          context: {
            category: DataSourceCategory.Default,
            sparklineColumns: ['sparkline'],
          },
        });
      });

      it('when query uses INLINE STATS with a SPARKLINE column', async () => {
        const result = await provider.resolve(
          createParams({
            query: { esql: 'FROM logs-* | INLINE STATS my_spark = SPARKLINE(bytes)' },
          })
        );
        expect(result).toEqual({
          isMatch: true,
          context: {
            category: DataSourceCategory.Default,
            sparklineColumns: ['my_spark'],
          },
        });
      });

      it('when query also has CATEGORIZE columns (sparkline profile resolves independently)', async () => {
        const result = await provider.resolve(
          createParams({
            query: {
              esql: 'FROM logs-* | STATS my_spark = SPARKLINE(bytes), pattern = CATEGORIZE(message)',
            },
          })
        );
        expect(result).toEqual({
          isMatch: true,
          context: {
            category: DataSourceCategory.Default,
            sparklineColumns: ['my_spark'],
          },
        });
      });
    });

    describe('does not match', () => {
      it('when data source is not ES|QL', async () => {
        const result = await provider.resolve(
          createParams({ dataSource: { type: DataSourceType.DataView, dataViewId: 'logs' } })
        );
        expect(result).toEqual(RESOLUTION_MISMATCH);
      });

      it('when data source is undefined', async () => {
        const result = await provider.resolve(createParams({ dataSource: undefined }));
        expect(result).toEqual(RESOLUTION_MISMATCH);
      });

      it('when ES|QL query has no STATS or INLINE STATS command', async () => {
        const result = await provider.resolve(createParams({ query: { esql: 'FROM logs-*' } }));
        expect(result).toEqual(RESOLUTION_MISMATCH);
      });

      it('when query is a non-ES|QL query', async () => {
        const result = await provider.resolve(
          createParams({ query: { language: 'kuery', query: 'message: error' } })
        );
        expect(result).toEqual(RESOLUTION_MISMATCH);
      });

      it('when query is undefined', async () => {
        const result = await provider.resolve(createParams({ query: undefined }));
        expect(result).toEqual(RESOLUTION_MISMATCH);
      });

      it('when STATS query has no SPARKLINE columns', async () => {
        const result = await provider.resolve(
          createParams({ query: { esql: 'FROM logs-* | STATS count = COUNT(*)' } })
        );
        expect(result).toEqual(RESOLUTION_MISMATCH);
      });
    });
  });

  describe('getCellRenderers', () => {
    const buildCellRenderers = (sparklineColumns: string[]) => {
      const getCellRenderers = provider.profile.getCellRenderers!(() => ({}), {
        context: {
          category: DataSourceCategory.Default,
          sparklineColumns,
        },
      });
      return getCellRenderers({
        rowHeight: 1,
        actions: {},
        dataView: {} as DataView,
        density: undefined,
      });
    };

    it('registers a renderer for each sparkline column', () => {
      const renderers = buildCellRenderers(['bytes_spark', 'req_spark']);
      expect(renderers).toHaveProperty('bytes_spark');
      expect(renderers).toHaveProperty('req_spark');
    });

    it('registered renderer is a function', () => {
      const renderers = buildCellRenderers(['my_spark']);
      expect(renderers.my_spark).toBeInstanceOf(Function);
    });

    it('falls through to prev when sparklineColumns is empty', () => {
      const existingRenderer = jest.fn();
      const prevRenderers = { existing_col: existingRenderer };
      const getCellRenderers = provider.profile.getCellRenderers!(() => prevRenderers, {
        context: {
          category: DataSourceCategory.Default,
          sparklineColumns: [],
        },
      });
      const params = {
        rowHeight: 1,
        actions: {},
        dataView: {} as DataView,
        density: undefined,
      };
      const renderers = getCellRenderers(params);
      expect(renderers).toBe(prevRenderers);
    });

    it('merges sparkline renderers with renderers from prev', () => {
      const existingRenderer = jest.fn();
      const getCellRenderers = provider.profile.getCellRenderers!(
        () => ({ existing_col: existingRenderer }),
        {
          context: {
            category: DataSourceCategory.Default,
            sparklineColumns: ['bytes_spark'],
          },
        }
      );
      const renderers = getCellRenderers({
        rowHeight: 1,
        actions: {},
        dataView: {} as DataView,
        density: undefined,
      });
      expect(renderers).toHaveProperty('existing_col', existingRenderer);
      expect(renderers).toHaveProperty('bytes_spark');
    });

    it('sparkline renderers do not override non-sparkline renderers from prev', () => {
      const nonSparklineRenderer = jest.fn();
      const getCellRenderers = provider.profile.getCellRenderers!(
        () => ({ some_other_col: nonSparklineRenderer }),
        {
          context: {
            category: DataSourceCategory.Default,
            sparklineColumns: ['my_spark'],
          },
        }
      );
      const renderers = getCellRenderers({
        rowHeight: 1,
        actions: {},
        dataView: {} as DataView,
        density: undefined,
      });
      expect(renderers.some_other_col).toBe(nonSparklineRenderer);
    });
  });
});
