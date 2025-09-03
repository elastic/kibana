/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isOfAggregateQueryType } from '@kbn/es-query';
import { METRICS_EXPERIENCE_PRODUCT_FEATURE_ID } from '../../../../../common/constants';
import type { DataSourceProfileProvider } from '../../../profiles';
import { DataSourceCategory, SolutionType } from '../../../profiles';
import type { ProfileProviderServices } from '../../profile_provider_services';
import { createChartSection } from './accessor/chart_section';
export type MetricsExperienceDataSourceProfileProvider = DataSourceProfileProvider<{}>;

const METRICS_DATA_SOURCE_PROFILE_ID = 'observability-metrics-data-source-profile';
export const createMetricsDataSourceProfileProvider = (
  services: ProfileProviderServices
): MetricsExperienceDataSourceProfileProvider => ({
  profileId: METRICS_DATA_SOURCE_PROFILE_ID,
  restrictedToProductFeature: METRICS_EXPERIENCE_PRODUCT_FEATURE_ID,
  isExperimental: true,
  profile: {
    getChartSectionConfiguration: createChartSection(
      services.metricsContextService.getMetricsExperienceClient()
    ),
  },
  resolve: (params) => {
    const metricsClient = services.metricsContextService.getMetricsExperienceClient();

    const isValidQuery =
      isOfAggregateQueryType(params.query) && params.query.esql.toLowerCase().includes('metrics');

    if (
      params.rootContext.solutionType !== SolutionType.Observability ||
      !isValidQuery ||
      !metricsClient
    ) {
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
