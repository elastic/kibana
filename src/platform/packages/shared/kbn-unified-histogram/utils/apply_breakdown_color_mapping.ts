/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ColorMapping } from '@kbn/coloring';
import type { XYVisualizationState } from '@kbn/lens-common';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';

/**
 * Returns a copy of the Lens attributes with the colour mapping set on every XY data layer that splits
 * its series by a breakdown field; attributes of other chart types are returned unchanged.
 */
export const applyBreakdownColorMapping = (
  attributes: TypedLensByValueInput['attributes'],
  colorMapping: ColorMapping.Config
): TypedLensByValueInput['attributes'] => {
  if (attributes.visualizationType !== 'lnsXY') {
    return attributes;
  }

  const visualization = attributes.state.visualization as XYVisualizationState | undefined;

  if (!Array.isArray(visualization?.layers)) {
    return attributes;
  }

  return {
    ...attributes,
    state: {
      ...attributes.state,
      visualization: {
        ...visualization,
        layers: visualization.layers.map((layer) =>
          layer.layerType === 'data' && 'splitAccessors' in layer && layer.splitAccessors?.length
            ? { ...layer, colorMapping }
            : layer
        ),
      },
    },
  };
};
