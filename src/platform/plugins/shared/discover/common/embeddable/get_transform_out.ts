/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { extractTabs, SavedSearchType } from '@kbn/saved-search-plugin/common';
import type { EnhancementsRegistry } from '@kbn/embeddable-plugin/common/enhancements/registry';
import type { SavedObjectReference } from '@kbn/core/server';
import type { SearchEmbeddableSerializedState } from './types';
import { inject } from './search_inject_extract';
import { SAVED_SEARCH_SAVED_OBJECT_REF_NAME } from './get_transform_in';
import { isByValueState } from './helpers';

export function getTransformOut(transformEnhancementsOut: EnhancementsRegistry['transformOut']) {
  function transformOut(
    state: SearchEmbeddableSerializedState,
    references?: SavedObjectReference[]
  ) {
    const enhancementsState = state.enhancements
      ? transformEnhancementsOut(state.enhancements, references ?? [])
      : undefined;

    const enhancements = enhancementsState ? { enhancements: enhancementsState } : {};

    const savedObjectRef = (references ?? []).find(
      (ref) => SavedSearchType === ref.type && ref.name === SAVED_SEARCH_SAVED_OBJECT_REF_NAME
    );
    if (savedObjectRef) {
      return {
        ...state,
        ...enhancements,
        savedObjectId: savedObjectRef.id,
      };
    }

    if (isByValueState(state)) {
      const tabsState = {
        ...state,
        attributes: extractTabs(state.attributes),
      };
      const { attributes } = inject({ type: 'search', ...tabsState }, references ?? []);
      return {
        ...tabsState,
        ...enhancements,
        ...attributes,
      };
    }

    return {
      ...state,
      ...enhancements,
    };
  }
  return transformOut;
}
