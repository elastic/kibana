/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { Reference } from '@kbn/content-management-utils';
import type { EnhancementsRegistry } from '@kbn/embeddable-plugin/common/enhancements/registry';
import type { EmbeddableTransforms } from '@kbn/embeddable-plugin/common';
import { type StoredTitles } from '@kbn/presentation-publishing-schemas';
import { transformTitlesIn, transformTitlesOut } from '@kbn/presentation-publishing';
import type { ImageConfig, ImageEmbeddableState } from '../server';

type StoredImageEmbeddableState = { imageConfig: ImageConfig } & StoredTitles & {
    enhancements?: any;
  };

export function getTransforms(
  transformEnhancementsIn: EnhancementsRegistry['transformIn'],
  transformEnhancementsOut: EnhancementsRegistry['transformOut']
): EmbeddableTransforms<StoredImageEmbeddableState, ImageEmbeddableState> {
  return {
    transformIn: (state: ImageEmbeddableState) => {
      const stateWithStoredTitles = transformTitlesIn(state);
      const { enhancementsState, enhancementsReferences } = stateWithStoredTitles.enhancements
        ? transformEnhancementsIn(state.enhancements)
        : { enhancementsState: undefined, enhancementsReferences: [] };

      return {
        state: {
          ...stateWithStoredTitles,
          ...(enhancementsState ? { enhancements: enhancementsState } : {}),
        },
        references: enhancementsReferences,
      };
    },
    transformOut: (state: ImageEmbeddableState, references?: Reference[]) => {
      const stateWithApiTitles = transformTitlesOut(state);
      const enhancementsState = state.enhancements
        ? transformEnhancementsOut(stateWithApiTitles.enhancements, references ?? [])
        : undefined;

      return {
        ...stateWithApiTitles,
        ...(enhancementsState ? { enhancements: enhancementsState } : {}),
      };
    },
  };
}
