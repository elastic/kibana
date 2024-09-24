/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { OverlayStart } from '@kbn/core-overlays-browser';

import { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import { extractReferences } from '../saved_visualization_references';
import { visualizationsClient } from '../../content_management';
import { TypesStart } from '../../vis_types';

interface UpdateBasicSoAttributesDependencies {
  savedObjectsTagging?: SavedObjectsTaggingApi;
  overlays: OverlayStart;
  typesService: TypesStart;
  contentManagement: ContentManagementPublicStart;
}

function getClientForType(
  type: string,
  typesService: TypesStart,
  contentManagement: ContentManagementPublicStart
) {
  const visAliases = typesService.getAliases();
  return (
    visAliases
      .find((v) => v.appExtensions?.visualizations.docTypes.includes(type))
      ?.appExtensions?.visualizations.client(contentManagement) || visualizationsClient
  );
}

function getAdditionalOptionsForUpdate(
  type: string,
  typesService: TypesStart,
  method: 'update' | 'create'
) {
  const visAliases = typesService.getAliases();
  const aliasType = visAliases.find((v) => v.appExtensions?.visualizations.docTypes.includes(type));
  if (!aliasType) {
    return { overwrite: true };
  }
  return aliasType?.appExtensions?.visualizations?.clientOptions?.[method];
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
  const client = getClientForType(type, dependencies.typesService, dependencies.contentManagement);

  const so = await client.get(soId);
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

  return await client.update({
    id: soId,
    data: {
      ...attributes,
    },
    options: {
      references,
      ...getAdditionalOptionsForUpdate(type, dependencies.typesService, 'update'),
    },
  });
};
