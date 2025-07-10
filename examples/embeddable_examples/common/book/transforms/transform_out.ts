/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '@kbn/content-management-utils';
import type { BookState } from '../../../server';
import { BookEmbeddableState, BookEmbeddableState910 } from '../types';
import { BOOK_SAVED_OBJECT_TYPE } from '../constants';

export function transformOut(
  storedState: BookEmbeddableState | BookEmbeddableState910,
  references?: Reference[]
): BookEmbeddableState {
  // storedState may contain legacy state stored from dashboards or URL

  // 9.1.0 by-value state stored book state under attributes
  if ('attributes' in storedState) {
    const { attributes, ...rest } = storedState as { attributes: BookState };
    return {
      ...attributes,
      ...rest,
    };
  }

  // 9.1.0 by-reference state stored by-reference id as savedBookId
  if ('savedBookId' in storedState) {
    const { savedBookId, ...rest } = storedState as { savedBookId: string };
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
      ...(storedState as BookEmbeddableState),
      savedObjectId: savedObjectRef.id,
    };
  }

  // storedState is current by-value state
  return storedState as BookEmbeddableState;
}
