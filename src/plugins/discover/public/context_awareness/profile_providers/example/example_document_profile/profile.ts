/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getFieldValue } from '@kbn/discover-utils';
import { DocumentProfileProvider, DocumentType } from '../../../profiles';

export const createExampleDocumentProfileProvider = (): DocumentProfileProvider => ({
  profileId: 'example-document-profile',
  isExperimental: true,
  profile: {},
  resolve: (params) => {
    if (getFieldValue(params.record, 'data_stream.type') !== 'example') {
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
