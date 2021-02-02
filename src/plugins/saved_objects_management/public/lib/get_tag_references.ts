/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SavedObjectsFindOptionsReference } from 'kibana/server';
import { SavedObjectsTaggingApi } from '../../../saved_objects_tagging_oss/public';

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
