/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isOfAggregateQueryType } from '@kbn/es-query';
import { dynamic } from '@kbn/shared-ux-utility';
import { METRICS_EXPERIENCE_PRODUCT_FEATURE_ID } from '../../../../../common/constants';
import type { DataSourceProfileProvider } from '../../../profiles';
import { DataSourceCategory, SolutionType } from '../../../profiles';
import type { ProfileProviderServices } from '../../profile_provider_services';

export type MetricsExperienceDataSourceProfileProvider = DataSourceProfileProvider<{}>;

const METRICS_DATA_SOURCE_PROFILE_ID = 'observability-metrics-data-source-profile';

const LazyMetricsGridSection = dynamic(() => import('./dummy_metrics_grid'));

export const createMetricsDataSourceProfileProvider = (
  services: ProfileProviderServices
): MetricsExperienceDataSourceProfileProvider => ({
  profileId: METRICS_DATA_SOURCE_PROFILE_ID,
  restrictedToProductFeature: METRICS_EXPERIENCE_PRODUCT_FEATURE_ID,
  isExperimental: true,
  profile: {
    getChartSectionConfiguration: (prev) => () => ({
      ...(prev ? prev() : {}),
      Component: LazyMetricsGridSection,
      replaceDefaultChart: true,
      localStorageKeyPrefix: 'discover:metricsExperience',
    }),
  },
  resolve: (params) => {
    // This filter still needs to be narrowed down to `FROM metrics-*` or `TS metrics-*`
    // and possibly other conditions

    const isValidQuery =
      isOfAggregateQueryType(params.query) && params.query.esql.toLowerCase().includes('metrics');

    if (params.rootContext.solutionType !== SolutionType.Observability || !isValidQuery) {
      return {
        isMatch: false,
      };
    }

    return {
      isMatch: true,
      context: {
        category: DataSourceCategory.Metrics,
      },
    };
  },
});
