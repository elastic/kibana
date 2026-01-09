/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '@kbn/content-management-utils/src/types';
import type { EnhancementsRegistry } from '@kbn/embeddable-plugin/common/enhancements/registry';
import { transformTitlesOut } from '@kbn/presentation-publishing';
import { VISUALIZE_SAVED_OBJECT_TYPE } from '@kbn/visualizations-common';
import { injectVisReferences } from '../../references/inject_vis_references';
import { VIS_SAVED_OBJECT_REF_NAME } from './get_transform_in';
import type { StoredVisualizeByValueState, StoredVisualizeEmbeddableState } from './types';

export function getTransformOut(transformEnhancementsOut: EnhancementsRegistry['transformOut']) {
  function transformOut(state: StoredVisualizeEmbeddableState, references?: Reference[]) {
    const stateWithApiTitles = transformTitlesOut(state);
    const enhancementsState = stateWithApiTitles.enhancements
      ? transformEnhancementsOut(stateWithApiTitles.enhancements, references ?? [])
      : undefined;

    // by ref
    const savedObjectRef = (references ?? []).find(
      (ref) => VISUALIZE_SAVED_OBJECT_TYPE === ref.type && ref.name === VIS_SAVED_OBJECT_REF_NAME
    );
    if (savedObjectRef) {
      return {
        ...stateWithApiTitles,
        ...(enhancementsState ? { enhancements: enhancementsState } : {}),
        savedObjectId: savedObjectRef.id,
      };
    }

    // by value
    if ((stateWithApiTitles as StoredVisualizeByValueState).savedVis) {
      const savedVis = injectVisReferences(
        (stateWithApiTitles as StoredVisualizeByValueState).savedVis,
        references ?? []
      );

      return {
        ...stateWithApiTitles,
        ...(enhancementsState ? { enhancements: enhancementsState } : {}),
        savedVis,
      };
    }

    return {
      ...stateWithApiTitles,
      ...(enhancementsState ? { enhancements: enhancementsState } : {}),
    };
  }
  return transformOut;
}
