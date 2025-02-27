/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataSourceCategory, DataSourceProfileProvider } from '../../../profiles';
import { extractIndexPatternFrom } from '../../extract_index_pattern_from';
import { ProfileProviderServices } from '../../profile_provider_services';
import { getCellRenderers, getDocViewer } from './accessors';

export const createTracesDataSourceProfileProvider = (
  services: ProfileProviderServices
): DataSourceProfileProvider => ({
  profileId: 'traces-data-source-profile',
  isExperimental: true,
  profile: {
    getDefaultAppState: () => () => ({
      columns: [
        {
          name: '@timestamp',
          width: 212,
        },
        {
          name: '_source',
        },
      ],
      rowHeight: 5,
    }),
    getDocViewer,
    getCellRenderers,
  },
  resolve: (params) => {
    const indexPattern = extractIndexPatternFrom(params);

    if (services.tracesContextService.containsTracesIndexPattern(indexPattern)) {
      return {
        isMatch: true,
        context: {
          category: DataSourceCategory.Traces,
        },
      };
    }

    return { isMatch: false };
  },
});
