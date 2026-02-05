/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataSourceContext, DataSourceProfileProvider } from '../../../profiles';
import { DataSourceCategory } from '../../../profiles';
import type { ProfileProviderServices } from '../../profile_provider_services';
import {
  getCellRenderers,
  getRowIndicatorProvider,
  createGetDefaultAppState,
  getPaginationConfig,
  getColumnsConfiguration,
  createRecommendedFields,
} from './accessors';
import { extractIndexPatternFrom } from '../../extract_index_pattern_from';

export type UniversalLogsDataSourceProfileProvider = DataSourceProfileProvider;

const UNIVERSAL_LOGS_DATA_SOURCE_PROFILE_ID = 'universal-logs-data-source-profile';

/**
 * Creates the universal base logs profile provider that works across all solution contexts
 * This profile activates based solely on data characteristics, not solution context
 */
export const createUniversalLogsDataSourceProfileProvider = (
  services: ProfileProviderServices
): UniversalLogsDataSourceProfileProvider => ({
  profileId: UNIVERSAL_LOGS_DATA_SOURCE_PROFILE_ID,
  profile: {
    getDefaultAppState: createGetDefaultAppState(),
    getCellRenderers,
    getRowIndicatorProvider,
    getPaginationConfig,
    getColumnsConfiguration,
    getRecommendedFields: createRecommendedFields({}),
  },
  resolve: (params) => {
    const indexPattern = extractIndexPatternFrom(params);

    // Check if this is a logs data source using the same logic as Observability
    if (!services.logsContextService.isLogsIndexPattern(indexPattern)) {
      return { isMatch: false };
    }

    // Check deployment model restrictions (exclude ES3 for Phase 1)
    const isES3 = params.rootContext.solutionNavId === 'es';
    if (isES3) {
      return { isMatch: false };
    }

    return {
      isMatch: true,
      context: {
        category: DataSourceCategory.Logs,
      },
    };
  },
});
