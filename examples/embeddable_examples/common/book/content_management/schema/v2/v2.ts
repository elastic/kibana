/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { VersionableEmbeddableObject } from '@kbn/embeddable-plugin/common';
import type { SavedBookAttributes } from '../../../../../server/types';
import type { BookAttributes } from '../../../../../server/book/content_management/schema/v2';
import type { BookAttributes as BookV1Attributes } from '../../../../../server/book/content_management/schema/v1';

function transformV1ToV2(v1Item: BookV1Attributes): BookAttributes {
  return {
    title: v1Item.bookTitle,
    author: v1Item.authorName,
    numberOfPages: v1Item.numberOfPages,
    synopsis: v1Item.bookSynopsis,
  };
}

function transformV2ToV1(v2Item: BookAttributes): BookV1Attributes {
  return {
    bookTitle: v2Item.title,
    authorName: v2Item.author,
    numberOfPages: v2Item.numberOfPages,
    bookSynopsis: v2Item.synopsis,
  };
}

export const bookAttributesDefinition: VersionableEmbeddableObject<
  SavedBookAttributes,
  BookAttributes,
  BookV1Attributes
> = {
  up: transformV1ToV2,
  down: transformV2ToV1,
  itemToSavedObject: transformV2ToV1,
  savedObjectToItem: transformV1ToV2,
};
