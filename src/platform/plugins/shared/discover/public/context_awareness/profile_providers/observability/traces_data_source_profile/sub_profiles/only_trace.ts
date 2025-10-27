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

// TODO search if there's helpers to extract filters from ESQL queries so we can use them here
function hasOnlyTraceIdFilter(esql: string): boolean {
  if (typeof esql !== 'string') return false;
  const normalized = esql.trim().replace(/[\r\n]+/g, ' ');
  // Allow any whitespace around = or ==, and after/before quotes
  const re = /^FROM\s+[\w\-\*\.,:\s]+?\|\s*WHERE\s+trace\.id\s*={1,2}\s*["']?\s*[\w\-]+\s*["']?$/i;
  return re.test(normalized);
}

export const createTracesOnlyTraceDataSourceProfileProvider = (
  { apmContextService: { tracesService } }: ProfileProviderServices,
  tracesDataSourceProfileProvider: DataSourceProfileProvider
): DataSourceProfileProvider => {
  const resolve: DataSourceProfileProvider['resolve'] = async (params) => {
    const baseResult = await tracesDataSourceProfileProvider.resolve(params);
    if (!baseResult.isMatch) {
      return baseResult;
    }
    if (
      params.rootContext.solutionType !== SolutionType.Observability ||
      !tracesService.isTracesIndexPattern(extractIndexPatternFrom(params)) ||
      !params.query
    ) {
      return { isMatch: false };
    }

    // Only enabled on ESQL for POC purposes
    if (!('esql' in params.query)) {
      return { isMatch: false };
    }

    if (hasOnlyTraceIdFilter(params.query.esql)) {
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
