/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectReference } from '@kbn/core/types';
import { SerializedSearchSourceFields } from './types';

export const injectReferences = (
  searchSourceFields: SerializedSearchSourceFields & { indexRefName: string },
  references: SavedObjectReference[]
) => {
  const searchSourceReturnFields: SerializedSearchSourceFields = { ...searchSourceFields };
  // Inject index id if a reference is saved
  if (searchSourceFields.indexRefName) {
    const reference = references.find((ref) => ref.name === searchSourceFields.indexRefName);
    if (!reference) {
      throw new Error(`Could not find reference for ${searchSourceFields.indexRefName}`);
    }
    // @ts-ignore
    searchSourceReturnFields.index = reference.id;
    // @ts-ignore
    delete searchSourceReturnFields.indexRefName;
  }

  if (searchSourceReturnFields.filter && Array.isArray(searchSourceReturnFields.filter)) {
    searchSourceReturnFields.filter.forEach((filterRow: any) => {
      if (!filterRow.meta || !filterRow.meta.indexRefName) {
        return;
      }
      const reference = references.find((ref: any) => ref.name === filterRow.meta.indexRefName);
      if (!reference) {
        throw new Error(`Could not find reference for ${filterRow.meta.indexRefName}`);
      }
      filterRow.meta.index = reference.id;
      delete filterRow.meta.indexRefName;
    });
  }

  return searchSourceReturnFields;
};
