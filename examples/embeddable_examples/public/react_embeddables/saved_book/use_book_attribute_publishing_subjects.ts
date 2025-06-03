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
import { BookAttributes } from './types';

export const useBookAttributePublishingSubjects: (
  bookAttributesManager: StateManager<BookAttributes>
) => {
  author: string;
  pages: number;
  title: string;
  synopsis?: string;
  published?: number;
  sequelTo?: string;
} = (bookAttributesManager) => {
  const { api: bookAttributesManagerApi } = bookAttributesManager;
  const [author, pages, title, synopsis, published, sequelTo] = useBatchedPublishingSubjects(
    bookAttributesManagerApi.author$,
    bookAttributesManagerApi.pages$,
    bookAttributesManagerApi.bookTitle$,
    bookAttributesManagerApi.synopsis$,
    bookAttributesManagerApi.published$,
    bookAttributesManagerApi.sequelTo$
  );
  return {
    author,
    pages,
    title,
    synopsis,
    published,
    sequelTo,
  };
};
