/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { SavedObjectsFindOptionsReference } from '../../../../core/server/saved_objects/types';
import type { SavedObjectsTaggingApi } from '../../../saved_objects_tagging_oss/public/api';

export const getTagFindReferences = ({
  selectedTags,
  taggingApi,
}: {
  selectedTags?: string[];
  taggingApi?: SavedObjectsTaggingApi;
}): SavedObjectsFindOptionsReference[] | undefined => {
  if (taggingApi && selectedTags) {
    const references: SavedObjectsFindOptionsReference[] = [];
    selectedTags.forEach((tagName) => {
      const ref = taggingApi.ui.convertNameToReference(tagName);
      if (ref) {
        references.push(ref);
      }
    });
    return references;
  }
  return undefined;
};
