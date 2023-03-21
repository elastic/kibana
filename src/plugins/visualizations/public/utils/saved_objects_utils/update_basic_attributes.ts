/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-browser';
import type { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { OverlayStart } from '@kbn/core-overlays-browser';
import type { SerializableRecord } from '@kbn/utility-types';

import { extractReferences } from '../saved_visualization_references';

interface UpdateBasicSoAttributesDependencies {
  savedObjectsClient: SavedObjectsClientContract;
  savedObjectsTagging?: SavedObjectsTaggingApi;
  overlays: OverlayStart;
}

export const updateBasicSoAttributes = async (
  soId: string,
  type: string,
  newAttributes: {
    title: string;
    description: string;
    tags: string[];
  },
  dependencies: UpdateBasicSoAttributesDependencies
) => {
  const so = await dependencies.savedObjectsClient.get<SerializableRecord>(type, soId);
  const extractedReferences = extractReferences({
    attributes: so.attributes,
    references: so.references,
  });

  let { references } = extractedReferences;

  const attributes = {
    ...extractedReferences.attributes,
    title: newAttributes.title,
    description: newAttributes.description,
  };

  if (dependencies.savedObjectsTagging) {
    references = dependencies.savedObjectsTagging.ui.updateTagsReferences(
      references,
      newAttributes.tags || []
    );
  }

  return await dependencies.savedObjectsClient.create(type, attributes, {
    id: soId,
    overwrite: true,
    references,
  });
};
