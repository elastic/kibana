/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { transformTitlesOut } from '@kbn/presentation-publishing';
import type { SavedObjectReference } from '@kbn/core/server';
import { MARKDOWN_SAVED_OBJECT_TYPE } from '../../../common';
import { MARKDOWN_SAVED_OBJECT_REF_NAME } from './get_transform_in';
import type { StoredMarkdownEmbeddableState } from '../types';

export function getTransformOut() {
  function transformOut(
    storedState: StoredMarkdownEmbeddableState,
    panelReferences?: SavedObjectReference[]
  ) {
    const state = transformTitlesOut(storedState);

    // by ref
    const savedObjectRef = (panelReferences ?? []).find(
      (ref) =>
        MARKDOWN_SAVED_OBJECT_TYPE === ref.type && ref.name === MARKDOWN_SAVED_OBJECT_REF_NAME
    );

    if (savedObjectRef) {
      return {
        ...state,
        ref_id: savedObjectRef.id,
      };
    }

    // by value
    return state;
  }
  return transformOut;
}
