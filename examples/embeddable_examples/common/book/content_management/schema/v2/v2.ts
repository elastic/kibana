/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { VersionableEmbeddableObject } from '@kbn/embeddable-plugin/common';
import type { ItemAttributesWithReferences } from '@kbn/embeddable-plugin/common/types';
import type { SavedBookAttributes } from '../../../../../server/types';
import type { BookAttributes } from '../../../../../server/book/content_management/schema/v2';
import type { BookAttributes as BookV1Attributes } from '../../../../../server/book/content_management/schema/v1';

function savedObjectToItem({
  attributes,
  references,
}: ItemAttributesWithReferences<BookV1Attributes>): ItemAttributesWithReferences<BookAttributes> {
  return {
    attributes: {
      title: attributes.bookTitle,
      author: attributes.authorName,
      numberOfPages: attributes.numberOfPages,
      synopsis: attributes.bookSynopsis,
    },
    references,
  };
}

function itemToSavedObject({
  attributes,
  references,
}: ItemAttributesWithReferences<BookAttributes>): ItemAttributesWithReferences<BookV1Attributes> {
  return {
    attributes: {
      bookTitle: attributes.title,
      authorName: attributes.author,
      numberOfPages: attributes.numberOfPages,
      bookSynopsis: attributes.synopsis,
    },
    references,
  };
}

export const bookAttributesDefinition: VersionableEmbeddableObject<
  SavedBookAttributes,
  BookAttributes,
  BookV1Attributes
> = {
  // up: transformV1ToV2,
  // down: transformV2ToV1,
  itemToSavedObject,
  savedObjectToItem,
};
