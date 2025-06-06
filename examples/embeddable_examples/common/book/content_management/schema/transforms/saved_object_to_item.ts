/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectAttributesWithReferences } from '@kbn/embeddable-plugin/common/types';
import type { SavedObjectReference } from '@kbn/core/server';
import { Mutable } from 'utility-types';
import type { SavedBookAttributes } from '../../../../../server/book/saved_object';
import type { BookAttributes } from '../../../../../server/book/content_management/latest';

const injectReferences = (attributes: SavedBookAttributes, references: SavedObjectReference[]) => {
  const injectedParams: Mutable<Partial<BookAttributes>> = {};
  if (attributes.metadata.sequelToBookRefName) {
    const sequelId = references.find((r) => r.name === attributes.metadata.sequelToBookRefName)?.id;
    if (sequelId) injectedParams.sequelTo = sequelId;
  }
  return injectedParams;
};

// 8.x used this SavedObject schema to store Book embeddables in URLs
// It is NOT recommended to radically change SavedObject schemas other than adding additional optional fields,
// but legacy URL handling is a special case
interface BookSavedURLObjectAttributes {
  bookTitle: string;
  bookSynopsis?: string;
  numberOfPages: number;
  authorName: string;
}
const isUrlObject = (so: unknown): so is BookSavedURLObjectAttributes =>
  !!(so as BookSavedURLObjectAttributes).bookTitle;

const savedURLObjectToItem = ({
  bookTitle,
  bookSynopsis,
  numberOfPages,
  authorName,
}: BookSavedURLObjectAttributes): BookAttributes => ({
  bookTitle,
  synopsis: bookSynopsis,
  author: authorName,
  pages: numberOfPages,
});

export const savedObjectToItem = (
  so: SavedObjectAttributesWithReferences<SavedBookAttributes> | BookSavedURLObjectAttributes
): BookAttributes =>
  isUrlObject(so)
    ? savedURLObjectToItem(so)
    : {
        bookTitle: so.attributes.bookTitleAsArray.join(''),
        author: so.attributes.metadata.text.authorName,
        pages: so.attributes.metadata.numbers.numberOfPages,
        synopsis: so.attributes.metadata.text.bookSynopsis,
        published: so.attributes.metadata.numbers.publicationYear ?? null,
        ...injectReferences(so.attributes, so.references),
      };
