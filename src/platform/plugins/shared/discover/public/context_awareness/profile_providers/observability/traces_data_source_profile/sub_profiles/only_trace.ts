/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  DataSourceCategory,
  SolutionType,
  type DataSourceProfileProvider,
} from '../../../../profiles';
import { extendProfileProvider } from '../../../extend_profile_provider';
import { extractIndexPatternFrom } from '../../../extract_index_pattern_from';
import { createChartSectionWaterfall } from '../accessors/chart_section_waterfall';
import type { ProfileProviderServices } from '../../../profile_provider_services';

export const createTracesOnlyTraceDataSourceProfileProvider = (
  { tracesContextService }: ProfileProviderServices,
  tracesDataSourceProfileProvider: DataSourceProfileProvider
): DataSourceProfileProvider => {
  const resolve: DataSourceProfileProvider['resolve'] = async (params) => {
    const baseResult = await tracesDataSourceProfileProvider.resolve(params);
    if (!baseResult.isMatch) {
      return baseResult;
    }

    const isOnlyTraceQuery = true; // TODO check if params.query contains only trace.id

    if (
      params.rootContext.solutionType === SolutionType.Observability &&
      tracesContextService.isTracesIndexPattern(extractIndexPatternFrom(params)) &&
      isOnlyTraceQuery
    ) {
      return {
        isMatch: true,
        context: { category: DataSourceCategory.Traces },
      };
    }

    return { isMatch: false };
  };

  return extendProfileProvider(tracesDataSourceProfileProvider, {
    profileId: 'observability-traces-only-trace-data-source-profile',
    profile: {
      getChartSectionConfiguration: createChartSectionWaterfall(),
    },
    resolve,
  });
};
