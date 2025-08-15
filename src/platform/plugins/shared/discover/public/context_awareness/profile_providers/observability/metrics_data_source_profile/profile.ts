/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { UnifiedHistogramMode } from '@kbn/unified-histogram';
import { isOfAggregateQueryType } from '@kbn/es-query';
import type { DataSourceProfileProvider } from '../../../profiles';
import { DataSourceCategory } from '../../../profiles';
import type { ProfileProviderServices } from '../../profile_provider_services';

export type MetricsDataSourceProfileProvider = DataSourceProfileProvider<{}>;

export const createMetricsDataSourceProfileProvider = (
  services: ProfileProviderServices
): MetricsDataSourceProfileProvider => ({
  profileId: 'metrics-data-source-profile',
  profile: {
    getDefaultAppState: (prev) => (params) => ({
      ...(prev ? prev(params) : {}),
      hideSidebar: true,
    }),
    getChartConfig: (prev) => () => ({
      ...(prev ? prev() : {}),
      mode: UnifiedHistogramMode.metrics,
    }),
  },
  resolve: (params) => {
    // if (params.rootContext.solutionType !== SolutionType.Observability) {
    //   return { isMatch: false };
    // }

    // TODO: implement a more robust matching logic
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
