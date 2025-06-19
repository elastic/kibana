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
import { i18n } from '@kbn/i18n';
import type { DataGridCellValueElementProps } from '@kbn/unified-data-table';
import { extractKeywordsFromRegex } from '@kbn/aiops-log-pattern-analysis';
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
  // isExperimental: true,
  profile: {
    getCellRenderers:
      (prev, { context }) =>
      (params) => {
        const { rowHeight } = params;
        const { patternColumns } = context;
        if (!patternColumns || patternColumns.length === 0) {
          return {
            ...prev(params),
          };
        }
        const patternRenderers = patternColumns.reduce(
          (acc, column) =>
            Object.assign(acc, {
              [column]: (props: DataGridCellValueElementProps) =>
                getPatternCellRenderer({ ...props, defaultRowHeight: rowHeight }),
            }),
          {}
        );

        return {
          ...prev(params),
          ...patternRenderers,
        };
      },
    getAdditionalCellActions: (prev, ss) => () => {
      return [
        ...prev(),
        {
          id: 'patterns-action-view-docs-in-discover',
          getDisplayName: () =>
            i18n.translate('discover.docViews.patterns.cellAction.viewDocsInDiscover', {
              defaultMessage: 'View docs in Discover',
            }),
          getIconType: () => 'discoverApp',
          execute: (context) => {
            const index = context.dataView?.getIndexPattern();
            if (!isOfAggregateQueryType(context.query) || !context.value || !index) {
              return;
            }

            const pattern = extractKeywordsFromRegex(context.value as string).join(' ');
            const categorizeField = context.query.esql.match(/CATEGORIZE\((.*)\)/)?.[1]?.trim();

            if (!categorizeField || !pattern) {
              return;
            }
            const query = {
              ...context.query,
              esql: `FROM ${index}\n  | WHERE MATCH(${categorizeField}, "${pattern}", {"auto_generate_synonyms_phrase_query": false, "fuzziness": 0, "operator": "AND"})\n  | LIMIT ${DOC_LIMIT}`,
            };

            const discoverLocator = services.share?.url.locators.get('DISCOVER_APP_LOCATOR');
            const discoverLink = discoverLocator?.getRedirectUrl({
              query,
              timeRange: services.data.query.timefilter.timefilter.getTime(),
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

    return {
      isMatch: true,
      context: {
        category: DataSourceCategory.Default,
        patternColumns,
      },
    };
  },
});
