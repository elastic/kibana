/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { StateManager } from '@kbn/presentation-publishing/state_manager/types';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import { BookAttributes, BookAttributesV3, BookAttributesV2, BookAttributesV1 } from './types';

const useBookAttributesV3 = (bookAttributesManager: StateManager<BookAttributes>) => {
  const { api: bookAttributesManagerApi } = bookAttributesManager as StateManager<BookAttributesV3>;
  const [author, pages, title, synopsis, published] = useBatchedPublishingSubjects(
    bookAttributesManagerApi.author$,
    bookAttributesManagerApi.pages$,
    bookAttributesManagerApi.bookTitle$,
    bookAttributesManagerApi.synopsis$,
    bookAttributesManagerApi.published$
  );
  return {
    author,
    pages,
    title,
    synopsis,
    published,
  };
};

const useBookAttributesV2 = (bookAttributesManager: StateManager<BookAttributes>) => {
  const { api: bookAttributesManagerApi } = bookAttributesManager as StateManager<BookAttributesV2>;
  const [author, pages, title, synopsis, published] = useBatchedPublishingSubjects(
    bookAttributesManagerApi.author$,
    bookAttributesManagerApi.numberOfPages$,
    bookAttributesManagerApi.bookTitle$,
    bookAttributesManagerApi.synopsis$,
    bookAttributesManagerApi.publicationYear$
  );

  return {
    author,
    pages,
    title,
    synopsis,
    published,
  };
};

const useBookAttributesV1 = (bookAttributesManager: StateManager<BookAttributes>) => {
  const { api: bookAttributesManagerApi } = bookAttributesManager as StateManager<BookAttributesV1>;
  const [author, pages, title, synopsis] = useBatchedPublishingSubjects(
    bookAttributesManagerApi.authorName$,
    bookAttributesManagerApi.numberOfPages$,
    bookAttributesManagerApi.bookTitle$,
    bookAttributesManagerApi.bookSynopsis$
  );

  return {
    author,
    pages,
    title,
    synopsis,
  };
};

export const useBookAttributePublishingSubjects: (
  apiVersion: number,
  bookAttributesManager: StateManager<BookAttributes>
) => {
  author: string;
  pages: number;
  title: string;
  synopsis?: string;
  published?: number;
} = (apiVersion, bookAttributesManager) => {
  const useAttributes =
    apiVersion === 3
      ? useBookAttributesV3
      : apiVersion === 2
      ? useBookAttributesV2
      : useBookAttributesV1;
  return useAttributes(bookAttributesManager);
};
