/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { VersionableEmbeddableObject } from '@kbn/embeddable-plugin/common';
import type {
  ItemAttributesWithReferences,
  SavedObjectAttributesWithReferences,
} from '@kbn/embeddable-plugin/common/types';
import type { SavedBookAttributesV2 } from '../../../../../server/types';
import type { BookAttributes } from '../../../../../server/book/content_management/schema/v2';
import type { BookAttributes as BookV1Attributes } from '../../../../../server/book/content_management/schema/v1';

function savedObjectToItem({
  attributes,
  references,
}: SavedObjectAttributesWithReferences<SavedBookAttributesV2>): ItemAttributesWithReferences<BookAttributes> {
  return {
    attributes: {
      bookTitle: attributes.bookTitle,
      author: attributes.authorName,
      numberOfPages: attributes.numberOfPages,
      synopsis: attributes.bookSynopsis,
      publicationYear: attributes.publicationYear ?? null,
    },
    references,
  };
}

function itemToSavedObject({
  attributes,
  references,
}: ItemAttributesWithReferences<BookAttributes>): SavedObjectAttributesWithReferences<SavedBookAttributesV2> {
  return {
    attributes: {
      bookTitle: attributes.bookTitle,
      authorName: attributes.author,
      numberOfPages: attributes.numberOfPages,
      bookSynopsis: attributes.synopsis,
      publicationYear: attributes.publicationYear ?? undefined,
    },
    references,
  };
}

export const bookAttributesDefinition: VersionableEmbeddableObject<
  SavedBookAttributesV2,
  BookAttributes,
  BookV1Attributes
> = {
  itemToSavedObject,
  savedObjectToItem,
};
