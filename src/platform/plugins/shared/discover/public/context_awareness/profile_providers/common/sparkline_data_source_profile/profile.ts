/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isOfAggregateQueryType } from '@kbn/es-query';
import { getSparklineColumns } from '@kbn/esql-utils';
import type { DataGridCellValueElementProps } from '@kbn/unified-data-table';
import { createElement } from 'react';
import { DataSourceType, isDataSourceType } from '../../../../../common/data_sources';
import type { DataSourceProfileProvider } from '../../../profiles';
import { DataSourceCategory } from '../../../profiles';
import type { ProfileProviderServices } from '../../profile_provider_services';
import { SparklineCellRenderer } from './sparkline_cell_renderer';

export const SPARKLINE_DATA_SOURCE_PROFILE_ID = 'sparkline-data-source-profile';

export type SparklineDataSourceProfileProvider = DataSourceProfileProvider<{
  sparklineColumns: string[];
}>;

export const createSparklineDataSourceProfileProvider = (
  services: ProfileProviderServices
): SparklineDataSourceProfileProvider => ({
  profileId: SPARKLINE_DATA_SOURCE_PROFILE_ID,
  profile: {
    getCellRenderers:
      (prev, { context }) =>
      (params) => {
        const { density } = params;
        const { sparklineColumns } = context;
        if (sparklineColumns.length === 0) {
          return prev(params);
        }
        const sparklineRenderers = sparklineColumns.reduce(
          (acc, column) =>
            Object.assign(acc, {
              [column]: (props: DataGridCellValueElementProps) =>
                createElement(SparklineCellRenderer, { ...props, services, density }),
            }),
          {}
        );
        return {
          ...prev(params),
          ...sparklineRenderers,
        };
      },
  },
  resolve: (params) => {
    if (!isDataSourceType(params.dataSource, DataSourceType.Esql)) {
      return { isMatch: false };
    }

    const { query } = params;

    if (!isOfAggregateQueryType(query)) {
      return { isMatch: false };
    }

    const sparklineColumns = getSparklineColumns(query.esql);
    if (sparklineColumns.length === 0) {
      return { isMatch: false };
    }

    return {
      isMatch: true,
      context: {
        category: DataSourceCategory.Default,
        sparklineColumns,
      },
    };
  },
});
