/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EnhancementsRegistry } from '@kbn/embeddable-plugin/common/enhancements/registry';
import { omit } from 'lodash';
import type {
  VisualizeByReferenceState,
  VisualizeByValueState,
  VisualizeEmbeddableState,
} from '../types';
import { VISUALIZE_SAVED_OBJECT_TYPE } from '../../constants';
import { extractEmbeddableReferences } from '../../references/extract_embeddable_references';

export function getTransformIn(transformEnhancementsIn: EnhancementsRegistry['transformIn']) {
  function transformIn(state: VisualizeEmbeddableState) {
    const { enhancementsState, enhancementsReferences } = state.enhancements
      ? transformEnhancementsIn(state.enhancements)
      : { enhancementsState: undefined, enhancementsReferences: [] };

    // by ref
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

    // by value
    if ((state as VisualizeByValueState).savedVis) {
      const { savedVis, ...rest } = state as VisualizeByValueState;
      const { references, serializedSearchSource } = extractEmbeddableReferences(savedVis);

      const savedSearchRefName = savedVis.data.savedSearchId
        ? references.find((r) => r.id === savedVis.data.savedSearchId)?.name
        : undefined;

      return {
        state: {
          ...rest,
          ...(enhancementsState ? { enhancements: enhancementsState } : {}),
          savedVis: {
            ...savedVis,
            data: {
              ...omit(savedVis.data, 'savedSearchId'),
              searchSource: serializedSearchSource,
              ...(savedSearchRefName
                ? {
                    savedSearchRefName,
                  }
                : {}),
            },
          },
        },
        references: [...references, ...enhancementsReferences],
      };
    }

    throw new Error('Unable to extract references from Visualization state, unexpected state');
  }
  return transformIn;
}
