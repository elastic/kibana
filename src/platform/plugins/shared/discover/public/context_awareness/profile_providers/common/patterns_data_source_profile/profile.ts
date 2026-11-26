/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Parser } from '@elastic/esql';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { getCategorizeColumns, getSparklineColumns } from '@kbn/esql-utils';
import { i18n } from '@kbn/i18n';
import type {
  CustomGridColumnsConfiguration,
  DataGridCellValueElementProps,
} from '@kbn/unified-data-table';
import { createElement } from 'react';
import { DataSourceType, isDataSourceType } from '../../../../../common/data_sources';
import type { DataSourceProfileProvider } from '../../../profiles';
import { DataSourceCategory } from '../../../profiles';
import { getPatternCellRenderer } from './pattern_cell_renderer';
import type { ProfileProviderServices } from '../../profile_provider_services';
import { SparklineCellRenderer } from '../sparkline_data_source_profile/sparkline_cell_renderer';
import { getMatchingResultsQuery } from './get_matching_results_query';

export const createPatternsDataSourceProfileProvider = (
  services: ProfileProviderServices
): DataSourceProfileProvider<{
  patternColumns: string[];
  sparklineColumns: string[];
}> => ({
  profileId: 'patterns-data-source-profile',
  profile: {
    getColumnsConfiguration:
      (prev, { context }) =>
      (params) => {
        const previous = prev(params);
        const { columns = [], dataSource, settings } = params ?? {};
        const hasFlexiblePattern = columns.some(
          (name) =>
            context.patternColumns.includes(name) &&
            dataSource?.getColumn(name)?.type === 'string' &&
            !settings?.columns?.[name]?.width
        );
        if (!hasFlexiblePattern || dataSource?.kind !== 'esql') {
          return previous;
        }

        const configuration: CustomGridColumnsConfiguration = { ...previous };
        for (const name of columns) {
          if (
            context.patternColumns.includes(name) ||
            dataSource.getColumn(name)?.type !== 'number' ||
            settings?.columns?.[name] !== undefined
          ) {
            continue;
          }
          configuration[name] = (columnProps) => {
            const column = previous[name]?.(columnProps) ?? columnProps.column;
            return { ...column, initialWidth: column.initialWidth ?? 150 };
          };
        }
        return configuration;
      },
    getCellRenderers:
      (prev, { context }) =>
      (params) => {
        const { rowHeight, density } = params;
        const { patternColumns, sparklineColumns } = context;
        if (!patternColumns || patternColumns.length === 0) {
          return prev(params);
        }
        const patternRenderers = patternColumns.reduce(
          (acc, column) =>
            Object.assign(acc, {
              [column]: (props: DataGridCellValueElementProps) =>
                getPatternCellRenderer(
                  props.row.flattened[props.columnId],
                  props.isDetails,
                  rowHeight
                ),
            }),
          {}
        );

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
          ...patternRenderers,
          ...sparklineRenderers,
        };
      },
    getAdditionalCellActions:
      (prev, { context, toolkit }) =>
      () => {
        return [
          ...prev(),
          {
            id: 'patterns-action-view-docs-in-discover',
            getDisplayName: ({ query }) => {
              if (isOfAggregateQueryType(query)) {
                const { root } = Parser.parse(query.esql);
                const statsIndex = root.commands.findLastIndex(({ name }) => name === 'stats');
                if (root.commands[statsIndex - 1]?.name === 'sample') {
                  return i18n.translate(
                    'discover.docViews.patterns.cellAction.viewResultsBeyondSampleLabel',
                    { defaultMessage: 'View matching results (searches beyond the sample)' }
                  );
                }
              }

              return i18n.translate('discover.docViews.patterns.cellAction.viewResults', {
                defaultMessage: 'View matching results',
              });
            },
            getIconType: () => 'productDiscover',
            isCompatible: (compatibleContext) => {
              const { query, field } = compatibleContext;
              const { patternColumns } = context;
              if (!isOfAggregateQueryType(query) || field === undefined) {
                return false;
              }
              return patternColumns.includes(field.name);
            },
            execute: async ({ query, dataView, esqlVariables, field, value, timeRange }) => {
              if (!isOfAggregateQueryType(query) || !dataView || typeof value !== 'string') {
                return;
              }

              const matchingResultsQuery = getMatchingResultsQuery({
                query,
                dataView,
                esqlVariables,
                patternColumn: field.name,
                pattern: value,
              });

              if (!matchingResultsQuery) {
                return;
              }

              if (toolkit.actions.updateESQLQuery) {
                toolkit.actions.updateESQLQuery(matchingResultsQuery.esql);
                return;
              }

              const discoverLink = services.locator.getRedirectUrl({
                query: matchingResultsQuery,
                timeRange,
                hideChart: false,
              });
              window.open(discoverLink, '_blank');
            },
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

    const sparklineColumns = getSparklineColumns(query.esql);

    void services.aiops?.aiopsUsage.trackRenderEsqlCategorizationResults();

    return {
      isMatch: true,
      context: {
        category: DataSourceCategory.Default,
        patternColumns,
        sparklineColumns,
      },
    };
  },
});
