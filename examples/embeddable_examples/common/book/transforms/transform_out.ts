/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '@kbn/content-management-utils';
import type { SavedObject } from '@kbn/core/server';
import type { BookAttributes, BookState } from '../../../server';

/* export interface BookByValueSerializedState {
  attributes: BookAttributes;
}

export interface BookByReferenceSerializedState {
  savedBookId: string;
}*/

export function transformOut(storedState: unknown, references: Reference[]) {}

export function savedObjectToBook(savedObject: SavedObject<BookAttributes>): BookState {
  return {
    bookTitle: savedObject.attributes.title,
    ...JSON.parse(savedObject.attributes.bookJSON),
  };
}
