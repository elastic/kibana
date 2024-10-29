/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import { DocumentProfileProvider, DocumentType } from '../../profiles';

export const exampleDocumentProfileProvider: DocumentProfileProvider = {
  profileId: 'example-document-profile',
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
};

const getFieldValue = (record: DataTableRecord, field: string) => {
  const value = record.flattened[field];
  return Array.isArray(value) ? value[0] : value;
};
