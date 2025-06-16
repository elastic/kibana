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
import type { BookAttributes } from '../../../../../server/book/content_management/schema/v3';
import type { BookAttributes as BookV2Attributes } from '../../../../../server/book/content_management/schema/v2';

export const bookAttributesDefinition: VersionableEmbeddableObject<
  SavedBookAttributes,
  BookAttributes,
  BookV2Attributes
> = {
  up: (item) => ({
    ...item,
    pages: item.numberOfPages,
  }),
  down: (item) => ({
    ...item,
    numberOfPages: item.pages,
  }),
  itemToSavedObject: (item) => ({
    bookTitle: item.title,
    authorName: item.author,
    numberOfPages: item.pages,
    bookSynopsis: item.synopsis,
  }),
  savedObjectToItem: (savedObject) => ({
    title: savedObject.bookTitle,
    author: savedObject.authorName,
    pages: savedObject.numberOfPages,
    synopsis: savedObject.bookSynopsis,
  }),
};
