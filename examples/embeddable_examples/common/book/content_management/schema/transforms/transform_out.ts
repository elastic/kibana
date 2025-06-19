/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectReference } from '@kbn/core/server';
import { Mutable } from 'utility-types';
import type { SavedBookAttributes } from '../../../../../server/book/saved_object';
import { BookItem } from '../schema';

const injectReferences = (attributes: SavedBookAttributes, references: SavedObjectReference[]) => {
  const injectedParams: Mutable<Partial<BookItem>> = {};
  if (attributes.metadata.sequelToBookRefName) {
    const sequelId = references.find((r) => r.name === attributes.metadata.sequelToBookRefName)?.id;
    if (sequelId) injectedParams.sequelTo = sequelId;
  }
  return injectedParams;
};

// Shape of state <=9.1
// Legacy shape could be provided to transformOut
// from URLs state or dashboard panel state
interface SavedBookAttributes910 {
  bookTitle: string;
  bookSynopsis?: string;
  numberOfPages: number;
  authorName: string;
}
const is910State = (
  state: SavedBookAttributes | SavedBookAttributes910
): state is SavedBookAttributes910 => !!(state as SavedBookAttributes910).bookTitle;

const transform910 = ({
  bookTitle,
  bookSynopsis,
  numberOfPages,
  authorName,
}: SavedBookAttributes910): BookItem => ({
  bookTitle,
  synopsis: bookSynopsis,
  author: authorName,
  pages: numberOfPages,
});

export const transformOut = (
  state: SavedBookAttributes | SavedBookAttributes910,
  references?: SavedObjectReference[]
): BookItem => {
  if (is910State(state)) return transform910(state as SavedBookAttributes910);

  const book = state as SavedBookAttributes;
  return {
    bookTitle: book.bookTitleAsArray.join(''),
    author: book.metadata.text.authorName,
    pages: book.metadata.numbers.numberOfPages,
    synopsis: book.metadata.text.bookSynopsis,
    published: book.metadata.numbers.publicationYear ?? undefined,
    ...injectReferences(book, references ?? []),
  };
};
