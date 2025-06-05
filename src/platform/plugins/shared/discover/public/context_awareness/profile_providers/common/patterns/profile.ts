/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isOfAggregateQueryType } from '@kbn/es-query';
import { getCategorizeColumns } from '@kbn/esql-utils';
import { DataSourceType, isDataSourceType } from '../../../../../common/data_sources';
import type { DataSourceProfileProvider } from '../../../profiles';
import { DataSourceCategory } from '../../../profiles';
import { PatternCellRenderer } from './pattern_cell_renderer';

export const createPatternDataSourceProfileProvider = (): DataSourceProfileProvider<{
  patternColumns: string[];
}> => ({
  profileId: 'patterns-data-source-profile',
  // isExperimental: true,
  profile: {
    getCellRenderers:
      (prev, { context }) =>
      (params) => {
        const { patternColumns } = context;
        if (!patternColumns || patternColumns.length === 0) {
          return {
            ...prev(params),
          };
        }
        const patternRenderers = context.patternColumns.reduce(
          (acc, column) =>
            Object.assign(acc, {
              [column]: PatternCellRenderer,
            }),
          {}
        );

        return {
          ...prev(params),
          ...patternRenderers,
        };
      },
    getAdditionalCellActions:
      (prev, { context }) =>
      () => {
        return [
          ...prev(),
          {
            id: 'patterns-data-source-action',
            getDisplayName: () => 'Example data source action',
            getIconType: () => 'anomalyChart',
            execute: () => {
              alert('Example data source action executed');
            },
            isCompatible: ({ field }) => true,
          },
        ];
      },
  },
  resolve: (params) => {
    if (!isDataSourceType(params.dataSource, DataSourceType.Esql)) {
      return { isMatch: false };
    }

    const query = params.query;

    if (!isOfAggregateQueryType(query)) {
      return { isMatch: false };
    }

    const patternColumns = getCategorizeColumns(query.esql);
    if (patternColumns.length === 0) {
      return { isMatch: false };
    }

    return {
      isMatch: true,
      context: {
        category: DataSourceCategory.Default,
        patternColumns,
      },
    };
  },
});
