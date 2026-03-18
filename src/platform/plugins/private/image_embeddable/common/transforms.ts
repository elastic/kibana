/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { Reference } from '@kbn/content-management-utils';
import type { DrilldownTransforms } from '@kbn/embeddable-plugin/common';
import { transformTitlesOut } from '@kbn/presentation-publishing';
import { flow, snakeCase, isObject } from 'lodash';
import type { ImageEmbeddableState } from '../server';

// Pre 9.4.0 image config was camelCased, recursively transform it to snake_case when transforming out
const transformToSnakeCase = (obj: object): object =>
  Object.entries(obj).reduce(
    (result, [key, value]) => ({
      ...result,
      [snakeCase(key)]: isObject(value) ? transformToSnakeCase(value) : value,
    }),
    {}
  );

export function getTransformOut(
  transformDrilldownsOut: DrilldownTransforms['transformOut']
): (storedState: object, panelReferences?: Reference[]) => object {
  return (storedState: object, panelReferences?: Reference[]) => {
    const transformsFlow = flow(
      // Strip fileImageMeta from src and hoist objectFit out of sizing — both removed in 9.4.0
      (state: Record<string, unknown>) => {
        if ('imageConfig' in state === false) return state;
        const config = state.imageConfig as Record<string, unknown>;

        const updated = { ...config };

        const src = updated.src as Record<string, unknown> | undefined;
        if (src?.fileImageMeta) {
          delete src.fileImageMeta;
        }

        const sizing = updated.sizing as Record<string, unknown> | undefined;
        if (sizing) {
          updated.objectFit = sizing.objectFit;
          delete updated.sizing;
        }

        return { ...state, imageConfig: updated };
      },
      transformToSnakeCase,
      transformTitlesOut<ImageEmbeddableState>,
      (state: ImageEmbeddableState) => transformDrilldownsOut(state, panelReferences)
    );
    return transformsFlow(storedState as ImageEmbeddableState);
  };
}

export function getTransforms(drilldownTransforms: DrilldownTransforms) {
  return {
    transformIn: (state: ImageEmbeddableState) => {
      return drilldownTransforms.transformIn(state);
    },
    transformOut: getTransformOut(drilldownTransforms.transformOut),
  };
}
