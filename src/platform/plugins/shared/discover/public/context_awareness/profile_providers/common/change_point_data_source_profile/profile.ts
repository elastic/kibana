/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { hasChangePointCommand, getChangePointOutputColumnNames } from '@kbn/esql-utils';
import { i18n } from '@kbn/i18n';
import type {
  DataGridCellValueElementProps,
  CustomGridColumnsConfiguration,
  CustomGridColumnProps,
  CustomCellRenderer,
} from '@kbn/unified-data-table';
import { SOURCE_COLUMN } from '@kbn/unified-data-table';
import { DataSourceType, isDataSourceType } from '../../../../../common/data_sources';
import type { DataSourceProfileProvider } from '../../../profiles';
import { DataSourceCategory } from '../../../profiles';
import { ChangePointPvalueCell } from './change_point_pvalue_cell';
import { ChangePointPvalueColumnHeader } from './change_point_pvalue_column_header';
import { ChangePointSummaryCell } from './change_point_summary_cell';
import {
  CHANGE_POINT_DATA_SOURCE_PROFILE_ID,
  type ChangePointChartSectionProps$,
  type ChangePointChartSectionSnapshot,
} from './change_point_context';
import type { ChangePointPvalueCellContext } from './change_point_pvalue_cell';
import { ChangePointChartSectionSync } from './change_point_chart_section_sync';
import { ChangePointDocViewerPanel } from './change_point_doc_viewer_panel';
import type { ProfileProviderServices } from '../../profile_provider_services';

const CHANGE_POINT_CHART_LOCAL_STORAGE_KEY = 'discover:changePointExperience';
const CHANGE_POINT_SUMMARY_COLUMN_WIDTH = 200;

/**
 * Extends the p-value cell context with the chart section props subject needed
 * by the flyout doc viewer tab.
 *
 * `DataSourceProfileProvider<TProviderContext>` merges this with the base
 * `DataSourceContext` (which already contributes `category`), so `category`
 * must NOT be included here.
 */
interface ChangePointDataSourceProfileContext extends ChangePointPvalueCellContext {
  typeColumnId: string;
  chartSectionProps$: ChangePointChartSectionProps$;
}

export const createChangePointDataSourceProfileProvider = (
  services: ProfileProviderServices
): DataSourceProfileProvider<ChangePointDataSourceProfileContext> => ({
  profileId: CHANGE_POINT_DATA_SOURCE_PROFILE_ID,
  profile: {
    getDefaultAppState:
      (prev, { context }) =>
      (params) => ({
        ...prev(params),
        columns: [
          { name: context.typeColumnId },
          { name: SOURCE_COLUMN, width: CHANGE_POINT_SUMMARY_COLUMN_WIDTH },
          { name: context.pvalueColumnId },
        ],
      }),
    getChartSectionConfiguration:
      (prev, { context, toolkit }) =>
      () => ({
        ...prev(),
        renderChartSection: (props) =>
          React.createElement(ChangePointChartSectionSync, {
            gridProps: props,
            actions: toolkit.actions,
            chartSectionProps$: context.chartSectionProps$,
          }),
        replaceDefaultChart: true as const,
        localStorageKeyPrefix: CHANGE_POINT_CHART_LOCAL_STORAGE_KEY,
        defaultTopPanelHeight: 'max-content',
      }),
    getColumnsConfiguration:
      (prev, { context }) =>
      (): CustomGridColumnsConfiguration => {
        const base = prev ? prev() : {};
        const { pvalueColumnId } = context ?? {};
        const config: CustomGridColumnsConfiguration = {
          ...base,
          [SOURCE_COLUMN]: ({ column }: CustomGridColumnProps) => ({
            ...column,
            // Keep a default width so Summary is not the last unconstrained column
            // (EUI's resize handle belongs to the column on the left of the divider).
            // Do not overwrite a width the user already set.
            initialWidth: column.initialWidth ?? CHANGE_POINT_SUMMARY_COLUMN_WIDTH,
            isExpandable: false,
            cellActions: [],
          }),
        };

        if (pvalueColumnId) {
          config[pvalueColumnId] = ({ column, headerRowHeight }: CustomGridColumnProps) => ({
            ...column,
            // Prevents EUI from right-aligning the header as a numeric column.
            schema: undefined,
            display: React.createElement(ChangePointPvalueColumnHeader, {
              columnDisplayName: column.displayAsText,
              headerRowHeight,
            }),
          });
        }

        return config;
      },
    getCellRenderers:
      (prev, { context }) =>
      (params) => {
        const { pvalueColumnId } = context;
        const renderers: CustomCellRenderer = {
          ...prev(params),
          [SOURCE_COLUMN]: (props: DataGridCellValueElementProps) =>
            React.createElement(ChangePointSummaryCell, {
              ...props,
              context,
              charts: services.charts,
            }),
        };

        if (pvalueColumnId) {
          renderers[pvalueColumnId] = (props: DataGridCellValueElementProps) =>
            React.createElement(ChangePointPvalueCell, { ...props, context });
        }

        return renderers;
      },
    getDocViewer:
      (prev, { context, toolkit }) =>
      (params) => {
        const prevDocViewer = prev(params);
        return {
          ...prevDocViewer,
          docViewsRegistry: (registry) => {
            registry.add({
              id: 'doc_view_change_point_chart',
              title: i18n.translate('discover.docViews.changePoint.title', {
                defaultMessage: 'Overview',
              }),
              order: 0,
              render: () =>
                // DocViewRenderProps.hit === params.record; use the closure value
                // so the panel does not need to accept DocViewRenderProps itself.
                React.createElement(ChangePointDocViewerPanel, {
                  record: params.record,
                  context,
                  actions: toolkit.actions,
                }),
            });
            return prevDocViewer.docViewsRegistry(registry);
          },
        };
      },
  },
  resolve: (params) => {
    if (!isDataSourceType(params.dataSource, DataSourceType.Esql)) {
      return { isMatch: false };
    }

    const query = params.query;
    if (!isOfAggregateQueryType(query) || !query.esql) {
      return { isMatch: false };
    }

    if (!hasChangePointCommand(query.esql)) {
      return { isMatch: false };
    }

    const columnNames = getChangePointOutputColumnNames(query.esql);
    const typeColumnId = columnNames?.typeColumn ?? 'type';
    const pvalueColumnId = columnNames?.pvalueColumn ?? 'pvalue';

    const chartSectionProps$ = new BehaviorSubject<ChangePointChartSectionSnapshot | undefined>(
      undefined
    );

    return {
      isMatch: true,
      context: {
        category: DataSourceCategory.Default,
        typeColumnId,
        pvalueColumnId,
        chartSectionProps$,
      },
    };
  },
});
