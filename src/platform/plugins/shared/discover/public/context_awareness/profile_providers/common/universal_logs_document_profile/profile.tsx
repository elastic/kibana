/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataSourceCategory, type DocumentProfileProvider } from '../../../profiles';
import type { ProfileProviderServices } from '../../profile_provider_services';
import { createGetDocViewer } from './accessors/get_doc_viewer';

export type UniversalLogsDocumentProfileProvider = DocumentProfileProvider;

const UNIVERSAL_LOGS_DOCUMENT_PROFILE_ID = 'universal-logs-document-profile';

/**
 * Creates the universal logs document profile provider
 * Works across all solution contexts to provide logs-optimized doc viewer
 */
export const createUniversalLogsDocumentProfileProvider = (
  services: ProfileProviderServices
): UniversalLogsDocumentProfileProvider => ({
  profileId: UNIVERSAL_LOGS_DOCUMENT_PROFILE_ID,
  profile: {
    getDocViewer: createGetDocViewer(services),
  },
  resolve: (params) => {
    // Only activate for documents in logs data sources
    if (params.dataSourceContext?.category !== DataSourceCategory.Logs) {
      return { isMatch: false };
    }

    return {
      isMatch: true,
    };
  },
});
