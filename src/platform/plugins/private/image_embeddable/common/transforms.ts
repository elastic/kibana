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
import type { ImageEmbeddableState } from '../server';

export function getTransforms(
  transformEnhancementsIn: EnhancementsRegistry['transformIn'],
  transformEnhancementsOut: EnhancementsRegistry['transformOut']
) {
  return {
    transformOutInjectsReferences: true,
    transformIn: (state: ImageEmbeddableState) => {
      const { enhancementsState, enhancementsReferences } = state.enhancements
        ? transformEnhancementsIn(state.enhancements)
        : { enhancementsState: undefined, enhancementsReferences: [] };

      return {
        state: {
          ...state,
          ...(enhancementsState ? { enhancements: enhancementsState } : {}),
        },
        references: enhancementsReferences,
      };
    },
    transformOut: (state: ImageEmbeddableState, references?: Reference[]) => {
      const enhancementsState = state.enhancements
        ? transformEnhancementsOut(state.enhancements, references ?? [])
        : undefined;

      return {
        ...state,
        ...(enhancementsState ? { enhancements: enhancementsState } : {}),
      };
    },
  };
}
