/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DocumentProfileProvider } from '../../../profiles';
import { DocumentType } from '../../../profiles';
import { OBSERVABILITY_DOCUMENT_PROFILE_ID, OBSERVABILITY_ROOT_PROFILE_ID } from '../consts';

export const createObservabilityBaseDocumentProfileProvider = (): DocumentProfileProvider => ({
  profileId: OBSERVABILITY_DOCUMENT_PROFILE_ID,
  profile: {},
  resolve: ({ rootContext }) => {
    if (rootContext.profileId !== OBSERVABILITY_ROOT_PROFILE_ID) {
      return { isMatch: false };
    }

    return {
      isMatch: true,
      context: {
        type: DocumentType.Default,
      },
    };
  },
});
