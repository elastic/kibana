/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { transformTitlesIn } from '@kbn/presentation-publishing';
import { LINKS_SAVED_OBJECT_TYPE } from '../../constants';
import type { LinksByReferenceState, LinksByValueState, LinksEmbeddableState } from '../types';
import { extractReferences } from './references';

export function transformIn(state: LinksEmbeddableState) {
  const stateWithStoredTitles = transformTitlesIn(state);
  if ('savedObjectId' in state) {
    const { savedObjectId, ...rest } = stateWithStoredTitles as LinksByReferenceState;
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
      ...stateWithStoredTitles,
      links,
    },
    references,
  };
}
