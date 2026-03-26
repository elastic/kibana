/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LINKS_SAVED_OBJECT_TYPE } from '../../constants';
import { extractReferences } from './references';
import type { LinksByReferenceState, LinksByValueState, LinksEmbeddableState } from '../types';

export function transformIn(state: LinksEmbeddableState) {
  if ((state as LinksByReferenceState).savedObjectId) {
    const { savedObjectId, ...rest } = state as LinksByReferenceState;
    return {
      state: rest,
      references: [
        {
          name: 'savedObjectRef',
          type: LINKS_SAVED_OBJECT_TYPE,
          id: savedObjectId,
        },
      ],
    };
  }

  const { links, references } = extractReferences((state as LinksByValueState).links);
  return {
    state: {
      ...state,
      links,
    },
    references,
  };
}
