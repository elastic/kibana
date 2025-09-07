/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EnhancementsRegistry } from '@kbn/embeddable-plugin/common/enhancements/registry';
import type { VisualizeByReferenceState, VisualizeEmbeddableState } from '../types';
import { VISUALIZE_SAVED_OBJECT_TYPE } from '../../constants';

export function getTransformIn(transformEnhancementsIn: EnhancementsRegistry['transformIn']) {
  function transformIn(state: VisualizeEmbeddableState) {
    const { enhancementsState, enhancementsReferences } = state.enhancements
      ? transformEnhancementsIn(state.enhancements)
      : { enhancementsState: undefined, enhancementsReferences: [] };

    if ((state as VisualizeByReferenceState).savedObjectId) {
      const { savedObjectId, ...rest } = state as VisualizeByReferenceState;
      return {
        state: {
          ...rest,
          ...(enhancementsState ? { enhancements: enhancementsState } : {}),
        },
        references: [
          {
            name: 'savedObjectRef',
            type: VISUALIZE_SAVED_OBJECT_TYPE,
            id: savedObjectId,
          },
          ...enhancementsReferences,
        ],
      };
    }
  }
  return transformIn;
}
