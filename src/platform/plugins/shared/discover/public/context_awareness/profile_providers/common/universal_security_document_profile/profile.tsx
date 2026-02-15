/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getFieldValue } from '@kbn/discover-utils';
import { DataSourceCategory, type DocumentProfileProvider, DocumentType } from '../../../profiles';
import type { ProfileProviderServices } from '../../profile_provider_services';
import { createGetDocViewer } from './accessors/get_doc_viewer';

export type UniversalSecurityDocumentProfileProvider = DocumentProfileProvider;

const UNIVERSAL_SECURITY_DOCUMENT_PROFILE_ID = 'universal-security-document-profile';

/**
 * Creates the universal security document profile provider
 * Works across all solutions to provide security-optimized doc viewer
 */
export const createUniversalSecurityDocumentProfileProvider = (
  services: ProfileProviderServices
): UniversalSecurityDocumentProfileProvider => ({
  profileId: UNIVERSAL_SECURITY_DOCUMENT_PROFILE_ID,
  profile: {
    getDocViewer: createGetDocViewer(services),
  },
  resolve: (params) => {
    // Only activate for documents in security data sources
    if (params.dataSourceContext?.category !== DataSourceCategory.Security) {
      return { isMatch: false };
    }

    // Detect if this is an alert (event.kind === 'signal')
    const isAlert = getFieldValue(params.record, 'event.kind') === 'signal';

    return {
      isMatch: true,
      context: {
        type: DocumentType.Default,
        isAlert,
      },
    };
  },
});
