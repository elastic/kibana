/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isOfAggregateQueryType } from '@kbn/es-query';
import type { DataGridCellValueElementProps } from '@kbn/unified-data-table';
import { getColumnsWithHighlights, type EsqlColumnHighlight } from '@kbn/esql-utils';
import { DataSourceType, isDataSourceType } from '../../../../../common/data_sources';
import type { DataSourceProfileProvider } from '../../../profiles';
import { DataSourceCategory } from '../../../profiles';
import { getHighlightCellRenderer } from './highlight_cell_renderer';

/**
 * ES|QL highlight profile.
 *
 * Adds support for highlighting matching text on the Discover data table in columns that are built using a highlighting algorithm.
 * Example:
 * ```
 * FROM books | EVAL snippets = TOP_SNIPPETS(description, "Tolkien", { "highlight": true })
 * ```
 * Will highlight text wrapped in <em/> in the `snippets` column.
 */
export const createHighlightDataSourceProfileProvider = (): DataSourceProfileProvider<{
  columnsWithHighlights: EsqlColumnHighlight[];
}> => ({
  profileId: 'highlight-data-source-profile',
  profile: {
    getCellRenderers:
      (prev, { context }) =>
      (params) => {
        const { columnsWithHighlights } = context;
        if (!columnsWithHighlights || columnsWithHighlights.length === 0) {
          return prev(params);
        }
        const columnsWithHighlightsRenderers = columnsWithHighlights.reduce(
          (acc, { column, preTag, postTag }) =>
            Object.assign(acc, {
              [column]: (props: DataGridCellValueElementProps) =>
                getHighlightCellRenderer(props.row.flattened[props.columnId], { preTag, postTag }),
            }),
          {}
        );

        return {
          ...prev(params),
          ...columnsWithHighlightsRenderers,
        };
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

    const columnsWithHighlights = getColumnsWithHighlights(query.esql);
    if (columnsWithHighlights.length === 0) {
      return { isMatch: false };
    }

    return {
      isMatch: true,
      context: {
        category: DataSourceCategory.Default,
        columnsWithHighlights,
      },
    };
  },
});
