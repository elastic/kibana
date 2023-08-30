/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { OverlayStart } from '@kbn/core-overlays-browser';

import { VisualizeListClientPluginStart } from '@kbn/visualize-list-client-plugin/public';
import { extractReferences } from '../saved_visualization_references';

interface UpdateBasicSoAttributesDependencies {
  savedObjectsTagging?: SavedObjectsTaggingApi;
  overlays: OverlayStart;
  visualizeListClient: VisualizeListClientPluginStart;
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
  const visualizationsClient = dependencies.visualizeListClient.getClientType(type);
  const so = await visualizationsClient.get(soId);
  const extractedReferences = extractReferences({
    attributes: so.item.attributes,
    references: so.item.references,
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

  return await visualizationsClient.update({
    id: soId,
    data: {
      ...attributes,
    },
    options: {
      overwrite: true,
      references,
    },
  });
};
