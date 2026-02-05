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
  getCellRenderers,
  getRowIndicatorProvider,
  createGetDefaultAppState,
  getPaginationConfig,
  getColumnsConfiguration,
  createRecommendedFields,
  createGetDocViewer,
  getRowAdditionalLeadingControls,
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
      getCellRenderers,
      getRowIndicatorProvider,
      getRowAdditionalLeadingControls,
      getPaginationConfig,
      getColumnsConfiguration,
      getRecommendedFields: createRecommendedFields({}),
      getDocViewer: createGetDocViewer(services),
    },
    resolve: (params) => {
    const indexPattern = extractIndexPatternFrom(params);

    // Debug logging
    // eslint-disable-next-line no-console
    console.log('[Universal Logs Profile] Checking index pattern:', indexPattern);
    // eslint-disable-next-line no-console
    console.log('[Universal Logs Profile] Solution Nav ID:', params.rootContext.solutionNavId);

    // Check if this is a logs data source using the same logic as Observability
    const isLogsPattern = services.logsContextService.isLogsIndexPattern(indexPattern);
    // eslint-disable-next-line no-console
    console.log('[Universal Logs Profile] Is logs pattern?', isLogsPattern);

    if (!isLogsPattern) {
      return { isMatch: false };
    }

    // No longer excluding ES3 - instead we'll check for app capabilities at render time
    // eslint-disable-next-line no-console
    console.log('[Universal Logs Profile] Using capability-based rendering');

    // eslint-disable-next-line no-console
    console.log('[Universal Logs Profile] ✅ ACTIVATED!');

    return {
      isMatch: true,
      context: {
        category: DataSourceCategory.Logs,
      },
    };
  },
  };
  
  // eslint-disable-next-line no-console
  console.log('[Universal Logs Profile] Profile created with extension points:', Object.keys(provider.profile));
  
  return provider;
};
