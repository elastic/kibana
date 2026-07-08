/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UpsertDocument } from '../types';

export const normalizeUpsertDocuments = <TDoc extends { id: string }>(
  documents: UpsertDocument<TDoc> | UpsertDocument<TDoc>[]
): UpsertDocument<TDoc>[] => {
  return Array.isArray(documents) ? documents : [documents];
};

export const assertUpsertDocumentsHaveIds = <TDoc extends { id: string }>(
  documents: UpsertDocument<TDoc>[]
): void => {
  for (const document of documents) {
    if (!document.id) {
      throw new Error('Document id is required for upsert');
    }
  }
};
