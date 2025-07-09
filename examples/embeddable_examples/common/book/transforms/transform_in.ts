/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BOOK_SAVED_OBJECT_TYPE } from '../constants';
import { BookByReferenceState, BookEmbeddableState } from '../types';

export function transformIn(state: BookEmbeddableState) {
  if ((state as BookByReferenceState).savedObjectId) {
    const { savedObjectId, ...rest } = state as BookByReferenceState;
    return {
      state: rest,
      references: {
        name: 'savedObjectRef',
        type: BOOK_SAVED_OBJECT_TYPE,
        id: savedObjectId,
      },
    };
  }

  return state;
}
