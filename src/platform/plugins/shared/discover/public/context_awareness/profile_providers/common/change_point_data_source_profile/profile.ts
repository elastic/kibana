/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { hasChangePointCommand, getChangePointOutputColumnNames } from '@kbn/esql-utils';
import type {
  DataGridCellValueElementProps,
  CustomGridColumnsConfiguration,
  CustomGridColumnProps,
} from '@kbn/unified-data-table';
import { DataSourceType, isDataSourceType } from '../../../../../common/data_sources';
import type { DataSourceProfileProvider } from '../../../profiles';
import { DataSourceCategory } from '../../../profiles';
import { ChangePointPvalueCell } from './change_point_pvalue_cell';
import { ChangePointPvalueColumnHeader } from './change_point_pvalue_column_header';
import { ChangePointExperienceView } from './change_point_experience_view';
import type { ChangePointExperienceViewProps } from './types';
import type { ChangePointPvalueCellContext } from './change_point_pvalue_cell';

const CHANGE_POINT_DATA_SOURCE_PROFILE_ID = 'change-point-data-source-profile';

const CHANGE_POINT_CHART_LOCAL_STORAGE_KEY = 'discover:changePointExperience';

export const createChangePointDataSourceProfileProvider =
  (): DataSourceProfileProvider<ChangePointPvalueCellContext> => ({
    profileId: CHANGE_POINT_DATA_SOURCE_PROFILE_ID,
    profile: {
      getChartSectionConfiguration: (prev) => (params) => ({
        ...prev(params),
        renderChartSection: (props) =>
          React.createElement(ChangePointExperienceView, {
            ...props,
            actions: params.actions,
          } as ChangePointExperienceViewProps),
        replaceDefaultChart: true as const,
        localStorageKeyPrefix: CHANGE_POINT_CHART_LOCAL_STORAGE_KEY,
        defaultTopPanelHeight: 'max-content',
      }),
      getColumnsConfiguration:
        (prev, { context }) =>
        (): CustomGridColumnsConfiguration => {
          const base = prev ? prev() : {};
          const { pvalueColumnId } = context ?? {};
          if (!pvalueColumnId) return base;
          return {
            ...base,
            [pvalueColumnId]: ({ column, headerRowHeight }: CustomGridColumnProps) => ({
              ...column,
              display: React.createElement(ChangePointPvalueColumnHeader, {
                columnDisplayName: column.displayAsText,
                headerRowHeight,
              }),
            }),
          };
        },
      getCellRenderers:
        (prev, { context }) =>
        (params) => {
          const { pvalueColumnId } = context;
          if (!pvalueColumnId) {
            return prev(params);
          }
          const pvalueRenderer = (props: DataGridCellValueElementProps) =>
            React.createElement(ChangePointPvalueCell, { ...props, context });
          return {
            ...prev(params),
            [pvalueColumnId]: pvalueRenderer,
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
      const pvalueColumnId = columnNames?.pvalueColumn ?? 'pvalue';

      return {
        isMatch: true,
        context: {
          category: DataSourceCategory.Default,
          pvalueColumnId,
        },
      };
    },
  });
