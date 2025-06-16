/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { VersionableEmbeddableObject } from '@kbn/embeddable-plugin/common';
import type { SavedBookAttributes } from '../../../../server/types';
import type { BookAttributes } from '../../../../server/book/content_management/schema';

export const bookAttributesDefinition: VersionableEmbeddableObject<
  SavedBookAttributes,
  BookAttributes
> = {
  itemToSavedObject: ({ attributes, references }) => ({
    attributes: {
      bookTitle: attributes.bookTitle,
      authorName: attributes.author,
      numberOfPages: attributes.pages,
      bookSynopsis: attributes.synopsis,
      publicationYear: attributes.published ?? undefined,
    },
    references,
  }),
  savedObjectToItem: ({ attributes, references }) => ({
    attributes: {
      bookTitle: attributes.bookTitle,
      author: attributes.authorName,
      pages: attributes.numberOfPages,
      synopsis: attributes.bookSynopsis,
      published: attributes.publicationYear ?? null,
    },
    references,
  }),
};
