/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TRACES_PRODUCT_FEATURE_ID } from '../../../../../common/constants';
import {
  SolutionType,
  DataSourceCategory,
  type DataSourceProfileProvider,
} from '../../../profiles';
import { extractIndexPatternFrom } from '../../extract_index_pattern_from';
import type { ProfileProviderServices } from '../../profile_provider_services';
import { getCellRenderers, getColumnsConfiguration } from './accessors';

const OBSERVABILITY_TRACES_DATA_SOURCE_PROFILE_ID = 'observability-traces-data-source-profile';

export interface TracesDataContext {
  category: DataSourceCategory.Traces;
  hasApm: boolean;
  hasUnprocessedOtel: boolean;
}

export const createTracesDataSourceProfileProvider = ({
  apmContextService,
  http,
}: ProfileProviderServices): DataSourceProfileProvider => {
  /**
   * POC comment:
   * This could be stored in a more centralized place, but for now it's here.
   */
  const getClusterTracesFlags = async (): Promise<{
    hasApm: boolean;
    hasUnprocessedOtel: boolean;
  }> => {
    try {
      const [hasData, hasUnprocessedOtel] = await Promise.allSettled([
        http.get<{ hasData: boolean }>('/internal/apm/has_data'),
        /*
         * POC comment:
         * Using an endpoint from apm, which we might want to review, as we might have unprocessed OTEL data in the cluster not related to APM.
         * Should we cover that case? How do we know which index the data is in?
         */
        http.get<{ hasUnprocessedOtelData: boolean }>('/internal/apm/has_unprocessed_otel_data'),
      ]);

      // eslint-disable-next-line no-console
      console.log('hasData', hasData);
      // eslint-disable-next-line no-console
      console.log('hasUnprocessedOtel', hasUnprocessedOtel);

      return {
        hasApm: hasData.status === 'fulfilled' ? Boolean(hasData.value.hasData) : false,
        hasUnprocessedOtel:
          hasUnprocessedOtel.status === 'fulfilled'
            ? Boolean(hasUnprocessedOtel.value.hasUnprocessedOtelData)
            : false,
      };
    } catch {
      return { hasApm: false, hasUnprocessedOtel: false };
    }
  };

  return {
    profileId: OBSERVABILITY_TRACES_DATA_SOURCE_PROFILE_ID,
    restrictedToProductFeature: TRACES_PRODUCT_FEATURE_ID,
    profile: {
      getDefaultAppState: (prev) => (params) => ({
        ...prev(params),
        columns: [{ name: '@timestamp', width: 212 }, { name: '_source' }],
        rowHeight: 5,
      }),
      getCellRenderers,
      getColumnsConfiguration,
    },
    resolve: async (params) => {
      if (
        params.rootContext.solutionType === SolutionType.Observability &&
        apmContextService.tracesService.isTracesIndexPattern(extractIndexPatternFrom(params))
      ) {
        const { hasApm, hasUnprocessedOtel } = await getClusterTracesFlags();

        return {
          isMatch: true,
          context: {
            category: DataSourceCategory.Traces,
            hasApm,
            hasUnprocessedOtel,
          } as TracesDataContext,
        };
      }

      return { isMatch: false };
    },
  };
};
