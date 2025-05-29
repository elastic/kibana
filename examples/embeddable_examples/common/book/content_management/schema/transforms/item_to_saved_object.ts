/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ItemAttributesWithReferences,
  SavedObjectAttributesWithReferences,
} from '@kbn/embeddable-plugin/common/types';
import type { BookAttributes } from '../../../../../server/book/content_management/latest';
import type { SavedBookAttributes } from '../../../../../server/book/saved_object';

export const itemToSavedObject = ({
  attributes,
  references,
}: ItemAttributesWithReferences<BookAttributes>): SavedObjectAttributesWithReferences<SavedBookAttributes> => ({
  attributes: {
    bookTitleAsArray: [...attributes.bookTitle],
    metadata: {
      numbers: {
        numberOfPages: attributes.pages,
        publicationYear: attributes.published ?? undefined,
      },
      text: {
        authorName: attributes.author,
        bookSynopsis: attributes.synopsis,
      },
    },
    // Generate a string of random letters and numbers to demonstrate simplifying a savedObject
    uselessGarbage: Array.from(Array(10), () => Math.random().toString(36).substring(2)).join(''),
  },
  references,
});
