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
import { transformTitlesIn } from '@kbn/presentation-publishing';
import { VISUALIZE_SAVED_OBJECT_TYPE } from '@kbn/visualizations-common';
import { extractVisReferences } from '../../references/extract_vis_references';
import type {
  VisualizeByReferenceState,
  VisualizeByValueState,
  VisualizeEmbeddableState,
} from '../types';
import type {
  StoredVisualizeByReferenceState,
  StoredVisualizeByValueState,
  StoredVisualizeEmbeddableState,
} from './types';

export const VIS_SAVED_OBJECT_REF_NAME = 'savedObjectRef';

export function getTransformIn(transformEnhancementsIn: EnhancementsRegistry['transformIn']) {
  function transformIn(state: VisualizeEmbeddableState): {
    state: StoredVisualizeEmbeddableState;
    references: Reference[];
  } {
    const stateWithStoredTitles = transformTitlesIn(state);
    const { enhancementsState, enhancementsReferences } = state.enhancements
      ? transformEnhancementsIn(state.enhancements)
      : { enhancementsState: undefined, enhancementsReferences: [] };

    // by ref
    if ((stateWithStoredTitles as VisualizeByReferenceState).savedObjectId) {
      const { savedObjectId, ...rest } = stateWithStoredTitles as VisualizeByReferenceState;
      return {
        state: {
          ...rest,
          ...(enhancementsState ? { enhancements: enhancementsState } : {}),
        } as StoredVisualizeByReferenceState,
        references: [
          {
            name: VIS_SAVED_OBJECT_REF_NAME,
            type: VISUALIZE_SAVED_OBJECT_TYPE,
            id: savedObjectId!,
          },
          ...enhancementsReferences,
        ],
      };
    }

    // by value
    if ((stateWithStoredTitles as VisualizeByValueState).savedVis) {
      const { references, savedVis } = extractVisReferences(
        (stateWithStoredTitles as VisualizeByValueState).savedVis
      );

      return {
        state: {
          ...stateWithStoredTitles,
          ...(enhancementsState ? { enhancements: enhancementsState } : {}),
          savedVis,
        } as StoredVisualizeByValueState,
        references: [...references, ...enhancementsReferences],
      };
    }

    return {
      state: {
        ...stateWithStoredTitles,
        ...(enhancementsState ? { enhancements: enhancementsState } : {}),
      } as StoredVisualizeEmbeddableState,
      references: enhancementsReferences,
    };
  }
  return transformIn;
}
