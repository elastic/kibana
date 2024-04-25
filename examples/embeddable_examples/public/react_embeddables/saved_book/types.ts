/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import { SavesExternalState, SerializedTitles } from '@kbn/presentation-publishing';
import { BehaviorSubject } from 'rxjs';

export interface BookAttributes {
  bookTitle: string;
  authorName: string;
  numberOfPages: number;
  bookDescription?: string;
}

export type BookStateManager = {
  [key in keyof Required<BookAttributes>]: BehaviorSubject<BookAttributes[key]>;
};

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

export type BookApi = DefaultEmbeddableApi<BookSerializedState> & SavesExternalState;
