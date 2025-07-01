/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isOfAggregateQueryType } from '@kbn/es-query';
import { extractCategorizeTokens, getCategorizeColumns, getCategorizeField } from '@kbn/esql-utils';
import { i18n } from '@kbn/i18n';
import type { DataGridCellValueElementProps } from '@kbn/unified-data-table';
import type { XYState } from '@kbn/lens-plugin/public';
import { DataSourceType, isDataSourceType } from '../../../../../common/data_sources';
import type { DataSourceProfileProvider } from '../../../profiles';
import { DataSourceCategory } from '../../../profiles';
import { getPatternCellRenderer } from './pattern_cell_renderer';
import type { ProfileProviderServices } from '../../profile_provider_services';

const DOC_LIMIT = 10000;

export const createPatternDataSourceProfileProvider = (
  services: ProfileProviderServices
): DataSourceProfileProvider<{
  patternColumns: string[];
}> => ({
  profileId: 'patterns-data-source-profile',
  profile: {
    getCellRenderers:
      (prev, { context }) =>
      (params) => {
        const { rowHeight } = params;
        const { patternColumns } = context;
        if (!patternColumns || patternColumns.length === 0) {
          return prev(params);
        }
        const patternRenderers = patternColumns.reduce(
          (acc, column) =>
            Object.assign(acc, {
              [column]: (props: DataGridCellValueElementProps) =>
                getPatternCellRenderer(props.row, props.columnId, props.isDetails, rowHeight),
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
            id: 'patterns-action-view-docs-in-discover',
            getDisplayName: () =>
              i18n.translate('discover.docViews.patterns.cellAction.viewResults', {
                defaultMessage: 'View matching results',
              }),
            getIconType: () => 'discoverApp',
            isCompatible: (compatibleContext) => {
              const { query, field } = compatibleContext;
              const { patternColumns } = context;
              if (!isOfAggregateQueryType(query) || field === undefined) {
                return false;
              }
              return patternColumns.includes(field.name);
            },
            execute: (executeContext) => {
              const index = executeContext.dataView?.getIndexPattern();
              if (
                !isOfAggregateQueryType(executeContext.query) ||
                !executeContext.value ||
                !index
              ) {
                return;
              }

              const pattern = extractCategorizeTokens(executeContext.value as string).join(' ');
              const categoryField = getCategorizeField(executeContext.query.esql);

              if (!categoryField || !pattern) {
                return;
              }

              const query = {
                ...executeContext.query,
                esql: `FROM ${index}\n  | WHERE MATCH(${categoryField}, "${pattern}", {"auto_generate_synonyms_phrase_query": false, "fuzziness": 0, "operator": "AND"})\n  | LIMIT ${DOC_LIMIT}`,
              };

              const discoverLink = services.locator.getRedirectUrl({
                query,
                timeRange: executeContext.timeRange,
                hideChart: false,
              });
              window.open(discoverLink, '_blank');
            },
          },
        ];
      },
    getDefaultAppState: (prev) => (params) => {
      return {
        ...prev(params),
        columns: [
          { name: 'Count', width: 150 },
          { name: 'Pattern', width: undefined },
        ],
      };
    },
    getModifiedVisAttributes: (prev) => (params) => {
      const prevAttributes = prev(params);

      if (prevAttributes.visualizationType === 'lnsXY') {
        const visualization = prevAttributes.state.visualization as XYState;

        if (visualization.tickLabelsVisibilitySettings) {
          visualization.tickLabelsVisibilitySettings.x = false;
        }
      }

      return prevAttributes;
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
