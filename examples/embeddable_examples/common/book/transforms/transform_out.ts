/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '@kbn/content-management-utils';
import type { BookAttributes, BookState } from '../../../server';
import { BookEmbeddableState } from '../types';
import { BOOK_SAVED_OBJECT_TYPE } from '../constants';

export function transformOut(storedState: unknown, references: Reference[]): BookEmbeddableState {
  // inject saved object reference when by-reference
  const savedObjectRef = references.find(
    ({ name, type }) => name === 'savedObjectRef' && type === BOOK_SAVED_OBJECT_TYPE
  );
  if (savedObjectRef) {
    return {
      ...(storedState as BookEmbeddableState),
      savedObjectId: savedObjectRef.id,
    };
  }

  // storedState may contain legacy state stored from dashboards or URL
  // In this example, legacy state was stored as Book saved object attributes
  if (storedState && typeof storedState === 'object' && 'bookJSON' in storedState) {
    return attributesToBook(storedState as BookAttributes);
  }

  return storedState as BookEmbeddableState;
}

export function attributesToBook(attributes: BookAttributes): BookState {
  return {
    bookTitle: attributes.title,
    ...JSON.parse(attributes.bookJSON),
  };
}
