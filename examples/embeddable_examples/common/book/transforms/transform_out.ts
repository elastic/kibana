/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '@kbn/content-management-utils';
import { transformTitlesOut } from '@kbn/presentation-publishing';
import type { BookState } from '../../../server';
import type { BookEmbeddableState, BookEmbeddableState910 } from '../types';
import { BOOK_SAVED_OBJECT_TYPE } from '../constants';

export function transformOut(
  storedState: BookEmbeddableState | BookEmbeddableState910,
  references?: Reference[]
): BookEmbeddableState {
  // storedState may contain legacy state stored from dashboards or URL
  const state = transformTitlesOut(storedState);

  // 9.1.0 by-value state stored book state under attributes
  if ('attributes' in state) {
    const { attributes, ...rest } = state as { attributes: BookState };
    return {
      ...attributes,
      ...rest,
    };
  }

  // 9.1.0 by-reference state stored by-reference id as savedBookId
  if ('savedBookId' in state) {
    const { savedBookId, ...rest } = state as { savedBookId: string };
    return {
      ...rest,
      savedObjectId: savedBookId,
    };
  }

  // inject saved object reference when by-reference
  const savedObjectRef = (references ?? []).find(
    ({ name, type }) => name === 'savedObjectRef' && type === BOOK_SAVED_OBJECT_TYPE
  );
  if (savedObjectRef) {
    return {
      ...(state as BookEmbeddableState),
      savedObjectId: savedObjectRef.id,
    };
  }

  // state is current by-value state
  return state as BookEmbeddableState;
}
