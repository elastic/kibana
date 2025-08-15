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
import type { DataSourceProfileProvider } from '../../../profiles';
import { DataSourceCategory } from '../../../profiles';
import type { ProfileProviderServices } from '../../profile_provider_services';

export type MetricsExperienceDataSourceProfileProvider = DataSourceProfileProvider<{}>;

const METRICS_DATA_SOURCE_PROFILE_ID = 'metrics-data-source-profile';

const LazyMetricsGridSection = dynamic(() => import('./dummy_metrics_grid'));

export const createMetricsDataSourceProfileProvider = (
  services: ProfileProviderServices
): MetricsExperienceDataSourceProfileProvider => ({
  profileId: METRICS_DATA_SOURCE_PROFILE_ID,
  profile: {
    getDefaultAppState: (prev) => (params) => ({
      ...(prev ? prev(params) : {}),
      hideSidebar: true,
    }),
    getChartSectionConfiguration: (prev) => () => ({
      ...(prev ? prev() : {}),
      Component: LazyMetricsGridSection,
      replaceDefaultHistogram: true,
      localStorageKeyPrefix: 'discover:metricsExperience',
      containerInitialHeight: 800,
    }),
  },
  resolve: (params) => {
    if (
      !isOfAggregateQueryType(params.query) ||
      !params.query.esql.toLowerCase().includes('metrics')
    ) {
      return {
        isMatch: false,
      };
    }

    return {
      isMatch: true,
      context: {
        category: DataSourceCategory.Logs,
      },
    };
  },
});
