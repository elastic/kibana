/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '@kbn/content-management-utils';
import { MARKDOWN_SAVED_OBJECT_TYPE } from '../../../common';
import type { MarkdownByReferenceState, MarkdownEmbeddableState } from '../..';
import type { StoredMarkdownEmbeddableState } from '../types';

export const MARKDOWN_SAVED_OBJECT_REF_NAME = 'savedObjectRef';

export function getTransformIn() {
  function transformIn(state: MarkdownEmbeddableState): {
    state: StoredMarkdownEmbeddableState;
    references: Reference[];
  } {
    // by ref
    if ((state as MarkdownByReferenceState).savedObjectId) {
      const { savedObjectId, ...rest } = state as MarkdownByReferenceState;
      return {
        state: rest as StoredMarkdownEmbeddableState,
        references: [
          {
            name: MARKDOWN_SAVED_OBJECT_REF_NAME,
            type: MARKDOWN_SAVED_OBJECT_TYPE,
            id: savedObjectId,
          },
        ],
      };
    }

    // by value
    return {
      state,
      references: [],
    };
  }
  return transformIn;
}
