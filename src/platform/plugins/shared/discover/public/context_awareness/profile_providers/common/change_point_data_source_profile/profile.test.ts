/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import React from 'react';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import { SOURCE_COLUMN } from '@kbn/unified-data-table';
import { DataSourceType } from '../../../../../common/data_sources';
import type { ContextWithProfileId } from '../../../profile_service';
import type { DataSourceProfileProviderParams, RootContext } from '../../../profiles';
import { DataSourceCategory, SolutionType } from '../../../profiles';
import type { DocViewsRegistry } from '@kbn/unified-doc-viewer';
import type { ProfileProviderServices } from '../../profile_provider_services';
import {
  CHANGE_POINT_DATA_SOURCE_PROFILE_ID,
  type ChangePointChartSectionSnapshot,
} from './change_point_context';
import { EMPTY_CONTEXT_AWARENESS_TOOLKIT } from '../../../toolkit';
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

  const mockServices = {
    charts: {
      theme: {
        useChartsBaseTheme: () => ({}),
      },
    } as unknown as ChartsPluginStart,
  } as unknown as ProfileProviderServices;

  const provider = createChangePointDataSourceProfileProvider(mockServices);

  /** Builds a minimal resolved context for use in profile accessor tests. */
  const buildContext = (overrides: Record<string, unknown> = {}) => ({
    category: DataSourceCategory.Default,
    typeColumnId: 'type',
    pvalueColumnId: 'pvalue',
    chartSectionProps$: new BehaviorSubject<ChangePointChartSectionSnapshot | undefined>(undefined),
    ...overrides,
  });

  /**
   * Resolves the provider with the given params overrides, asserts it matched,
   * and returns the context — eliminating the repeated isMatch guard in each test.
   */
  const resolveMatch = async (overrides: Partial<DataSourceProfileProviderParams> = {}) => {
    const result = await provider.resolve(createParams(overrides));
    expect(result.isMatch).toBe(true);
    if (!result.isMatch) throw new Error('Expected isMatch: true');
    return result.context;
  };

  /** Builds a registry mock and the spread form expected by docViewsRegistry. */
  const buildRegistry = () => {
    const addMock = jest.fn();
    const registry = { add: addMock } as unknown as DocViewsRegistry;
    return { addMock, registryArg: { ...registry, clone: () => registry } as never };
  };

  const MOCK_RECORD = { id: 'row-1', raw: {}, flattened: {} } as never;

  describe('resolve', () => {
    describe('matches', () => {
      it('returns isMatch true with category, column ids, and chartSectionProps$ for a top-level CHANGE_POINT query', async () => {
        const context = await resolveMatch();
        expect(context).toMatchObject({
          category: DataSourceCategory.Default,
          typeColumnId: 'type',
          pvalueColumnId: 'pvalue',
        });
        expect(context.chartSectionProps$).toBeInstanceOf(BehaviorSubject);
        expect((context.chartSectionProps$ as BehaviorSubject<unknown>).getValue()).toBeUndefined();
      });

      it('picks up custom type and pvalue AS aliases', async () => {
        const context = await resolveMatch({
          query: {
            esql: 'FROM logs-* | STATS avg_val = AVG(bytes) BY bucket = BUCKET(@timestamp, 1h) | CHANGE_POINT avg_val ON bucket AS change_type, p_value',
          },
        });
        expect(context).toMatchObject({
          category: DataSourceCategory.Default,
          typeColumnId: 'change_type',
          pvalueColumnId: 'p_value',
        });
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
      const getConfig = provider.profile.getChartSectionConfiguration!(
        () => ({ replaceDefaultChart: false }),
        {
          context: buildContext(),
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

  describe('getDefaultAppState', () => {
    it('defaults to type, pvalue, and Summary columns', () => {
      const getDefaultAppState = provider.profile.getDefaultAppState!(() => ({}), {
        context: buildContext(),
        toolkit: EMPTY_CONTEXT_AWARENESS_TOOLKIT,
      });
      expect(getDefaultAppState({ dataView: {} as DataView })).toEqual({
        columns: [{ name: 'type' }, { name: SOURCE_COLUMN, width: 200 }, { name: 'pvalue' }],
      });
    });

    it('uses type and pvalue aliases from context', () => {
      const getDefaultAppState = provider.profile.getDefaultAppState!(() => ({}), {
        context: buildContext({ typeColumnId: 'change_type', pvalueColumnId: 'p_value' }),
        toolkit: EMPTY_CONTEXT_AWARENESS_TOOLKIT,
      });
      expect(getDefaultAppState({ dataView: {} as DataView })).toEqual({
        columns: [
          { name: 'change_type' },
          { name: SOURCE_COLUMN, width: 200 },
          { name: 'p_value' },
        ],
      });
    });
  });

  describe('getColumnsConfiguration', () => {
    it('customises the pvalue header and Summary column width', () => {
      const getColumns = provider.profile.getColumnsConfiguration!(() => ({}), {
        context: buildContext({ pvalueColumnId: 'my_pvalue' }),
        toolkit: EMPTY_CONTEXT_AWARENESS_TOOLKIT,
      });
      const config = getColumns();
      expect(config).toHaveProperty('my_pvalue');
      expect(
        config[SOURCE_COLUMN]!({
          column: { id: SOURCE_COLUMN } as never,
          headerRowHeight: 1,
        }).initialWidth
      ).toBe(200);
      expect(
        config[SOURCE_COLUMN]!({
          column: { id: SOURCE_COLUMN, initialWidth: 400 } as never,
          headerRowHeight: 1,
        }).initialWidth
      ).toBe(400);
      expect(
        config[SOURCE_COLUMN]!({
          column: { id: SOURCE_COLUMN, cellActions: [jest.fn()] } as never,
          headerRowHeight: 1,
        })
      ).toEqual(
        expect.objectContaining({
          isExpandable: false,
        })
      );
    });

    it('keeps Summary config and previous columns when pvalueColumnId is empty', () => {
      const getColumns = provider.profile.getColumnsConfiguration!(
        () => ({ existing: {} as never }),
        {
          context: buildContext({ pvalueColumnId: '' }),
          toolkit: EMPTY_CONTEXT_AWARENESS_TOOLKIT,
        }
      );
      const result = getColumns();
      expect(result).toHaveProperty('existing');
      expect(result).toHaveProperty(SOURCE_COLUMN);
      expect(result).not.toHaveProperty('');
    });
  });

  describe('getCellRenderers', () => {
    const buildRenderers = (pvalueColumnId: string) => {
      const getCellRenderers = provider.profile.getCellRenderers!(() => ({}), {
        context: buildContext({ pvalueColumnId }),
        toolkit: EMPTY_CONTEXT_AWARENESS_TOOLKIT,
      });
      return getCellRenderers({
        rowHeight: 1,
        dataView: {} as DataView,
        density: undefined,
      });
    };

    it('registers pvalue and Summary renderers', () => {
      const renderers = buildRenderers('pvalue');
      expect(renderers.pvalue).toBeInstanceOf(Function);
      expect(renderers[SOURCE_COLUMN]).toBeInstanceOf(Function);
    });

    it('keeps Summary and prev renderers when pvalueColumnId is empty', () => {
      const existingRenderer = jest.fn();
      const prevRenderers = { some_col: existingRenderer };
      const getCellRenderers = provider.profile.getCellRenderers!(() => prevRenderers, {
        context: buildContext({ pvalueColumnId: '' }),
        toolkit: EMPTY_CONTEXT_AWARENESS_TOOLKIT,
      });
      const renderers = getCellRenderers({
        rowHeight: 1,
        dataView: {} as DataView,
        density: undefined,
      });
      expect(renderers.some_col).toBe(existingRenderer);
      expect(renderers[SOURCE_COLUMN]).toBeInstanceOf(Function);
      expect(renderers).not.toHaveProperty('');
    });
  });

  describe('getDocViewer', () => {
    const buildDocViewer = () => {
      const getDocViewer = provider.profile.getDocViewer!(
        () => ({ title: undefined, docViewsRegistry: (r: DocViewsRegistry) => r }),
        { context: buildContext(), toolkit: EMPTY_CONTEXT_AWARENESS_TOOLKIT }
      );
      return getDocViewer({ record: MOCK_RECORD });
    };

    describe('registered tab', () => {
      let addMock: jest.Mock;

      beforeEach(() => {
        const { addMock: mock, registryArg } = buildRegistry();
        addMock = mock;
        buildDocViewer().docViewsRegistry(registryArg);
      });

      it('registers the doc_view_change_point_chart tab with correct id, order, and render function', () => {
        expect(addMock).toHaveBeenCalledWith(
          expect.objectContaining({ id: 'doc_view_change_point_chart', order: 0 })
        );
        const renderFn = addMock.mock.calls[0][0].render;
        expect(React.isValidElement(renderFn({} as never))).toBe(true);
      });
    });

    it('chains the previous registry callback', () => {
      const prevRegistry = { add: jest.fn() } as unknown as DocViewsRegistry;
      const prevDocViewsRegistry = jest.fn(() => prevRegistry);
      const getDocViewer = provider.profile.getDocViewer!(
        () => ({ title: undefined, docViewsRegistry: prevDocViewsRegistry }),
        { context: buildContext(), toolkit: EMPTY_CONTEXT_AWARENESS_TOOLKIT }
      );
      const docViewer = getDocViewer({ record: MOCK_RECORD });
      const { registryArg } = buildRegistry();
      const result = docViewer.docViewsRegistry(registryArg);
      expect(prevDocViewsRegistry).toHaveBeenCalled();
      expect(result).toBe(prevRegistry);
    });
  });
});
