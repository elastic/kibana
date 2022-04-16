/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { SavedObjectsFindOptionsReference } from '@kbn/core/server';
import { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';

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
