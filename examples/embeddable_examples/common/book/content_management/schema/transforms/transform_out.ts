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

// <=9.1 used schema to store Book embeddables in URLs
// It is NOT recommended to radically change SavedObject schemas other than adding additional optional fields,
// but legacy URL handling is a special case
interface SavedBookAttributes910 {
  bookTitle: string;
  bookSynopsis?: string;
  numberOfPages: number;
  authorName: string;
}
const is910State = (panelConfig: SavedBookAttributes | SavedBookAttributes910): so is SavedBookAttributes910 =>
  !!(panelConfig as SavedBookAttributes910).bookTitle;

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
  panelConfig: SavedBookAttributes | SavedBookAttributes910,
  references?: SavedObjectReference[],
): BookItem => {
  if (is910State(panelConfig)) return transform910(panelConfig as SavedBookAttributes910);
  
  const book = panelConfig as SavedBookAttributes;
  return {
    bookTitle: book.bookTitleAsArray.join(''),
    author: book.metadata.text.authorName,
    pages: book.metadata.numbers.numberOfPages,
    synopsis: book.metadata.text.bookSynopsis,
    published: book.metadata.numbers.publicationYear ?? undefined,
    ...injectReferences(book, references ?? []),
  };
}