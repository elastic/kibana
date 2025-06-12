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
import { DataSourceType, isDataSourceType } from '../../../../../common/data_sources';
import type { DataSourceProfileProvider } from '../../../profiles';
import { DataSourceCategory } from '../../../profiles';
import { PatternCellRenderer, extractGenericKeywords } from './pattern_cell_renderer';
import type { ProfileProviderServices } from '../../profile_provider_services';

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

            const pattern = extractGenericKeywords(context.value as string).join(' ');
            const categorizeField = context.query.esql.match(/CATEGORIZE\((.*)\)/)?.[1]?.trim();

            if (!categorizeField || !pattern) {
              return;
            }
            const query = {
              ...context.query,
              esql: `FROM ${index}\n  | WHERE MATCH(${categorizeField}, "${pattern}", {"auto_generate_synonyms_phrase_query": false, "fuzziness": 0, "operator": "AND"})\n  | LIMIT 10000`,
            };

            const discoverLocator = services.share?.url.locators.get('DISCOVER_APP_LOCATOR');
            const discoverLink = discoverLocator?.getRedirectUrl({
              query,
              timeRange: services.data.query.timefilter.timefilter.getTime(),
            });
            window.open(discoverLink, '_blank');
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
