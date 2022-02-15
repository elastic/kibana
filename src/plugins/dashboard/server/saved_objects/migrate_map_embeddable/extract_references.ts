/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectReference } from '../../../../../core/types';

interface IndexPatternReferenceDescriptor {
  indexPatternId?: string;
  indexPatternRefName?: string;
}

interface JoinDescriptor {
  right: {
    indexPatternId?: string;
  };
}

interface LayerDescriptor {
  sourceDescriptor: {
    indexPatternId?: string;
  };
}

type VectorLayerDescriptor = LayerDescriptor & {
  joins?: JoinDescriptor[];
};

export function extractReferences({ attributes }: { attributes: Record<string, string> }) {
  if (!attributes.layerListJSON) {
    return { attributes, references: [] };
  }

  const extractedReferences: SavedObjectReference[] = [];

  let layerList: LayerDescriptor[] = [];
  try {
    layerList = JSON.parse(attributes.layerListJSON);
  } catch (e) {
    return { attributes, references: [] };
  }

  layerList.forEach((layer, layerIndex) => {
    // Extract index-pattern references from source descriptor
    if (layer.sourceDescriptor && 'indexPatternId' in layer.sourceDescriptor) {
      const sourceDescriptor = layer.sourceDescriptor as IndexPatternReferenceDescriptor;
      const refName = `layer_${layerIndex}_source_index_pattern`;
      extractedReferences.push({
        name: refName,
        type: 'index-pattern',
        id: sourceDescriptor.indexPatternId!,
      });
      delete sourceDescriptor.indexPatternId;
      sourceDescriptor.indexPatternRefName = refName;
    }

    if ('joins' in layer) {
      // Extract index-pattern references from join
      const vectorLayer = layer as VectorLayerDescriptor;
      const joins = vectorLayer.joins ? vectorLayer.joins : [];
      joins.forEach((join, joinIndex) => {
        if ('indexPatternId' in join.right) {
          const sourceDescriptor = join.right as IndexPatternReferenceDescriptor;
          const refName = `layer_${layerIndex}_join_${joinIndex}_index_pattern`;
          extractedReferences.push({
            name: refName,
            type: 'index-pattern',
            id: sourceDescriptor.indexPatternId!,
          });
          delete sourceDescriptor.indexPatternId;
          sourceDescriptor.indexPatternRefName = refName;
        }
      });
    }
  });

  return {
    attributes: {
      ...attributes,
      layerListJSON: JSON.stringify(layerList),
    },
    references: extractedReferences,
  };
}
