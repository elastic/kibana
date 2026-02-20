/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '@kbn/content-management-utils';
import { VISUALIZE_SAVED_OBJECT_TYPE } from '@kbn/visualizations-common';
import type { DrilldownTransforms } from '@kbn/embeddable-plugin/common';
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

export function getTransformIn(transformDrilldownsIn: DrilldownTransforms['transformIn']) {
  function transformIn(state: VisualizeEmbeddableState): {
    state: StoredVisualizeEmbeddableState;
    references: Reference[];
  } {
    const { state: storedState, references: drilldownReferences } = transformDrilldownsIn(state);

    // by ref
    if ((storedState as VisualizeByReferenceState).savedObjectId) {
      const { savedObjectId, ...rest } = storedState as VisualizeByReferenceState;
      return {
        state: {
          ...rest,
        } as StoredVisualizeByReferenceState,
        references: [
          {
            name: VIS_SAVED_OBJECT_REF_NAME,
            type: VISUALIZE_SAVED_OBJECT_TYPE,
            id: savedObjectId!,
          },
          ...drilldownReferences,
        ],
      };
    }

    // by value
    if ((storedState as VisualizeByValueState).savedVis) {
      const { references, savedVis } = extractVisReferences(
        (storedState as VisualizeByValueState).savedVis
      );

      return {
        state: {
          ...storedState,
          savedVis,
        } as StoredVisualizeByValueState,
        references: [...references, ...drilldownReferences],
      };
    }

    return {
      state: {
        ...storedState,
      } as StoredVisualizeEmbeddableState,
      references: drilldownReferences,
    };
  }
  return transformIn;
}
