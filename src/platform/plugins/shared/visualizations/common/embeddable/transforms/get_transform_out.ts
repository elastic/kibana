/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '@kbn/content-management-utils/src/types';
import { transformTitlesOut } from '@kbn/presentation-publishing';
import type { DrilldownTransforms } from '@kbn/embeddable-plugin/common';
import { VISUALIZE_SAVED_OBJECT_TYPE } from '@kbn/visualizations-common';
import { flow } from 'lodash';
import { injectVisReferences } from '../../references/inject_vis_references';
import { VIS_SAVED_OBJECT_REF_NAME } from './get_transform_in';
import type { StoredVisualizeByValueState, StoredVisualizeEmbeddableState } from './types';

export function getTransformOut(transformDrilldownsOut: DrilldownTransforms['transformOut']) {
  function transformOut(storedState: StoredVisualizeEmbeddableState, references?: Reference[]) {
    const transformsFlow = flow(
      transformTitlesOut<StoredVisualizeEmbeddableState>,
      (state: StoredVisualizeEmbeddableState) => transformDrilldownsOut(state, references)
    );
    const state = transformsFlow(storedState);

    // by ref
    const savedObjectRef = (references ?? []).find(
      (ref) => VISUALIZE_SAVED_OBJECT_TYPE === ref.type && ref.name === VIS_SAVED_OBJECT_REF_NAME
    );
    if (savedObjectRef) {
      return {
        ...state,
        savedObjectId: savedObjectRef.id,
      };
    }

    // by value
    if ((state as StoredVisualizeByValueState).savedVis) {
      const savedVis = injectVisReferences(
        (state as StoredVisualizeByValueState).savedVis,
        references ?? []
      );

      return {
        ...state,
        savedVis,
      };
    }

    return state;
  }
  return transformOut;
}
