/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import {
  type HasEditCapabilities,
  type HasInPlaceLibraryTransforms,
  type SerializedTitles,
  type StateComparators,
} from '@kbn/presentation-publishing';
import { type BehaviorSubject } from 'rxjs';

export interface BookAttributes {
  bookTitle: string;
  authorName: string;
  numberOfPages: number;
  bookSynopsis?: string;
}

export type BookAttributesManager = {
  [key in keyof Required<BookAttributes>]: BehaviorSubject<BookAttributes[key]>;
} & { comparators: StateComparators<BookAttributes> };

export interface BookByValueSerializedState {
  attributes: BookAttributes;
}

export interface BookByReferenceSerializedState {
  savedBookId: string;
}

export type BookSerializedState = SerializedTitles &
  (BookByValueSerializedState | BookByReferenceSerializedState);

/**
 * Book runtime state is a flattened version of all possible state keys.
 */
export interface BookRuntimeState
  extends BookAttributes,
    Partial<BookByReferenceSerializedState>,
    SerializedTitles {}

export type BookApi = DefaultEmbeddableApi<BookSerializedState, BookRuntimeState> &
  HasEditCapabilities &
  HasInPlaceLibraryTransforms<BookRuntimeState>;
