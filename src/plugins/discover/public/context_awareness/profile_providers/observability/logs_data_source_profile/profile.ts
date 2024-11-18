/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataSourceCategory, DataSourceProfileProvider } from '../../../profiles';
import { ProfileProviderServices } from '../../profile_provider_services';
import {
  getCellRenderers,
  getRowIndicatorProvider,
  getRowAdditionalLeadingControls,
} from './accessors';
import { extractIndexPatternFrom } from '../../extract_index_pattern_from';
import { OBSERVABILITY_ROOT_PROFILE_ID } from '../consts';

export const createLogsDataSourceProfileProvider = (
  services: ProfileProviderServices
): DataSourceProfileProvider => ({
  profileId: 'observability-logs-data-source-profile',
  profile: {
    getCellRenderers,
    getRowIndicatorProvider,
    getRowAdditionalLeadingControls,
  },
  resolve: (params) => {
    if (params.rootContext.profileId !== OBSERVABILITY_ROOT_PROFILE_ID) {
      return { isMatch: false };
    }

    const indexPattern = extractIndexPatternFrom(params);

    if (!services.logsContextService.isLogsIndexPattern(indexPattern)) {
      return { isMatch: false };
    }

    return {
      isMatch: true,
      context: { category: DataSourceCategory.Logs },
    };
  },
});
