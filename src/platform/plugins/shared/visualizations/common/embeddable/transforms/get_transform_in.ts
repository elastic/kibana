/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import type { Reference } from '@kbn/content-management-utils';
import { VISUALIZE_SAVED_OBJECT_TYPE } from '@kbn/visualizations-common';
import type {
  VisualizeByReferenceState,
  VisualizeByValueState,
  VisualizeEmbeddableState,
} from '../types';
import { extractVisReferences } from '../../references/extract_vis_references';
import type {
  StoredVisualizeByReferenceState,
  StoredVisualizeByValueState,
  StoredVisualizeEmbeddableState,
} from './types';

export const VIS_SAVED_OBJECT_REF_NAME = 'savedObjectRef';

export function getTransformIn(
  transformEnhancementsIn: EmbeddableSetup['transformEnhancementsIn']
) {
  function transformIn(state: VisualizeEmbeddableState): {
    state: StoredVisualizeEmbeddableState;
    references: Reference[];
  } {
    const enhancementsResults = state.enhancements
      ? transformEnhancementsIn(state.enhancements)
      : { state: undefined, references: [] };

    // by ref
    if ((state as VisualizeByReferenceState).savedObjectId) {
      const { savedObjectId, ...rest } = state as VisualizeByReferenceState;
      return {
        state: {
          ...rest,
          ...(enhancementsResults.state ? { enhancements: enhancementsResults.state } : {}),
        } as StoredVisualizeByReferenceState,
        references: [
          {
            name: VIS_SAVED_OBJECT_REF_NAME,
            type: VISUALIZE_SAVED_OBJECT_TYPE,
            id: savedObjectId!,
          },
          ...enhancementsResults.references,
        ],
      };
    }

    // by value
    if ((state as VisualizeByValueState).savedVis) {
      const { references, savedVis } = extractVisReferences(
        (state as VisualizeByValueState).savedVis
      );

      return {
        state: {
          ...state,
          ...(enhancementsResults.state ? { enhancements: enhancementsResults.state } : {}),
          savedVis,
        } as StoredVisualizeByValueState,
        references: [...references, ...enhancementsResults.references],
      };
    }

    return {
      state: {
        ...state,
        ...(enhancementsResults.state ? { enhancements: enhancementsResults.state } : {}),
      } as StoredVisualizeEmbeddableState,
      references: enhancementsResults.references,
    };
  }
  return transformIn;
}
