/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '@kbn/content-management-utils';
import type { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import type { ImageEmbeddableState } from '../server';

export function getTransforms(
  transformEnhancementsIn: EmbeddableSetup['transformEnhancementsIn'],
  transformEnhancementsOut: EmbeddableSetup['transformEnhancementsOut']
) {
  return {
    transformIn: (state: ImageEmbeddableState) => {
      const enhancementResult = state.enhancements
        ? transformEnhancementsIn(state.enhancements)
        : { state: undefined, references: [] };

      return {
        state: {
          ...state,
          ...(enhancementResult.state ? { enhancements: enhancementResult.state } : {}),
        },
        references: enhancementResult.references,
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
