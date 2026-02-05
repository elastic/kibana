/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataSourceProfileProvider } from '../../../profiles';
import { DataSourceCategory } from '../../../profiles';
import type { ProfileProviderServices } from '../../profile_provider_services';
import {
  createGetCellRenderers,
  getRowIndicatorProvider,
  createGetDefaultAppState,
  getPaginationConfig,
  getColumnsConfiguration,
  createRecommendedFields,
  createGetRowAdditionalLeadingControls,
} from './accessors';
import { extractIndexPatternFrom } from '../../extract_index_pattern_from';

export type UniversalLogsDataSourceProfileProvider = DataSourceProfileProvider;

const UNIVERSAL_LOGS_DATA_SOURCE_PROFILE_ID = 'universal-logs-data-source-profile';

/**
 * Creates the universal base logs profile provider that works across all solution contexts
 * 
 * Key Features:
 * - Activates based solely on data characteristics (not solution context)
 * - Uses capability-based feature detection (not deployment exclusions)
 * - Works in ALL deployments including ES3
 * - Features gracefully degrade based on available apps:
 *   - Streams integration (if Streams app exists)
 *   - APM traces (if APM exists)
 *   - SLO creation (if SLO capabilities exist)
 * 
 * This approach eliminates the need for separate variants and ensures
 * the profile works universally while adapting to the environment.
 */
export const createUniversalLogsDataSourceProfileProvider = (
  services: ProfileProviderServices
): UniversalLogsDataSourceProfileProvider => {
  const provider = {
    profileId: UNIVERSAL_LOGS_DATA_SOURCE_PROFILE_ID,
    profile: {
      getDefaultAppState: createGetDefaultAppState(),
      getCellRenderers: createGetCellRenderers(services),
      getRowIndicatorProvider,
      getRowAdditionalLeadingControls: createGetRowAdditionalLeadingControls(services),
      getPaginationConfig,
      getColumnsConfiguration,
      getRecommendedFields: createRecommendedFields({}),
    },
    resolve: (params) => {
    const indexPattern = extractIndexPatternFrom(params);

    // Check if this is a logs data source using the same detection logic
    if (!services.logsContextService.isLogsIndexPattern(indexPattern)) {
      return { isMatch: false };
    }

    return {
      isMatch: true,
      context: {
        category: DataSourceCategory.Logs,
      },
    };
  },
  };
  
  return provider;
};
