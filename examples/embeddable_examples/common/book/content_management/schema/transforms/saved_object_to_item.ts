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
import type { SavedBookAttributes } from '../../../../../server/book/saved_object';
import type { BookAttributes } from '../../../../../server/book/content_management/latest';

export const savedObjectToItem = ({
  attributes,
  references,
}: SavedObjectAttributesWithReferences<SavedBookAttributes>): ItemAttributesWithReferences<BookAttributes> => ({
  attributes: {
    bookTitle: attributes.bookTitleAsArray.join(''),
    author: attributes.metadata.text.authorName,
    pages: attributes.metadata.numbers.numberOfPages,
    synopsis: attributes.metadata.text.bookSynopsis,
    published: attributes.metadata.numbers.publicationYear ?? null,
  },
  references,
});
