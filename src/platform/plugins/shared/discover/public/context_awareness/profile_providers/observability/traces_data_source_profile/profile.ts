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
  tracesDataSourcesSummary: {
    hasEcs: boolean;
    hasUnprocessedOtel: boolean;
  };
}

export const createTracesDataSourceProfileProvider = ({
  apmContextService,
  http,
}: ProfileProviderServices): DataSourceProfileProvider => {
  /**
   * POC comment:
   * This could be stored in a more centralized place, but for now it's here.
   */
  const getTracesDataSourcesSummary = async (): Promise<{
    hasEcs: boolean;
    hasUnprocessedOtel: boolean;
  }> => {
    try {
      const { hasEcs, hasUnprocessedOtel } = await http.get<{
        hasEcs: boolean;
        hasUnprocessedOtel: boolean;
      }>('/internal/apm/traces_data_sources_summary');
      return { hasEcs, hasUnprocessedOtel };
    } catch {
      return { hasEcs: false, hasUnprocessedOtel: false };
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
        const { hasEcs, hasUnprocessedOtel } = await getTracesDataSourcesSummary();

        return {
          isMatch: true,
          context: {
            category: DataSourceCategory.Traces,
            tracesDataSourcesSummary: { hasEcs, hasUnprocessedOtel },
          } as TracesDataContext,
        };
      }

      return { isMatch: false };
    },
  };
};
