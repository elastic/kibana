/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import {
  HasEditCapabilities,
  HasLibraryTransforms,
  PublishesUnsavedChanges,
  SerializedTitles,
} from '@kbn/presentation-publishing';
import { BookItem } from '../../../common/book/content_management/schema';

export { type BookItem };

export interface BookSavedObject {
  id: string;
  attributes: BookItem;
}

export type BookByValueSerializedState = BookItem;

export interface BookByReferenceSerializedState {
  savedObjectId: string;
}

export interface HasSavedBookId {
  getSavedBookId: () => string | undefined;
}

export type BookSerializedState = SerializedTitles &
  (BookByValueSerializedState | BookByReferenceSerializedState);

/**
 * Book runtime state is a flattened version of all possible state keys.
 */
export type BookRuntimeState = BookItem &
  Partial<BookByReferenceSerializedState> &
  SerializedTitles;

export type BookApi = DefaultEmbeddableApi<BookSerializedState> &
  HasEditCapabilities &
  HasLibraryTransforms<BookByReferenceSerializedState, BookByValueSerializedState> &
  HasSavedBookId &
  PublishesUnsavedChanges;
