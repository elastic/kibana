/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AggregateQuery, Query } from '@kbn/es-query';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { DiscoverTabType } from '@kbn/discover-session-constants';
import type { DataSourceProfileProvider } from '../../../profiles';
import { DataSourceCategory } from '../../../profiles';
import { createChartSection } from './accessor/chart_section';
import { getDefaultAppState } from './accessor/get_default_app_state';
import { PRESENTATION_ESQL_MARKER } from './constants';

export type PresentationDataSourceProfileProvider = DataSourceProfileProvider<{}>;

export const PRESENTATION_DATA_SOURCE_PROFILE_ID = 'presentation-data-source-profile';

export const createPresentationDataSourceProfileProvider =
  (): PresentationDataSourceProfileProvider => ({
    profileId: PRESENTATION_DATA_SOURCE_PROFILE_ID,
    profile: {
      getChartSectionConfiguration: createChartSection(),
      getDefaultAppState,
    },
    resolve: async ({ query }) => {
      if (!isPresentationQuery(query)) {
        return { isMatch: false };
      }

      return {
        isMatch: true,
        context: {
          category: DataSourceCategory.Default,
          tabType: DiscoverTabType.Presentation,
        },
      };
    },
  });

function isPresentationQuery(query: AggregateQuery | Query | undefined): query is AggregateQuery {
  if (!isOfAggregateQueryType(query)) {
    return false;
  }

  return query.esql.includes(PRESENTATION_ESQL_MARKER);
}
