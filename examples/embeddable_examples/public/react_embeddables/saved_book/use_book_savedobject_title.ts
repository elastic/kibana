/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import { useState, useLayoutEffect, useCallback } from 'react';
import { BOOK_CONTENT_ID } from '../../../common/book/content_management/schema';
import { BookItem } from './types';

export const useBookSavedObjectTitle = (
  id: string | null,
  contentClient: ContentManagementPublicStart['client']
): string | null => {
  const [title, setTitle] = useState<string | null>(null);

  const getTitleFromId = useCallback(async () => {
    if (!id) return null;
    try {
      const so: { item: BookItem } = await contentClient.get({
        id,
        contentTypeId: BOOK_CONTENT_ID,
      });
      const { bookTitle } = so.item;
      return bookTitle;
    } catch {
      return null;
    }
  }, [id, contentClient]);

  useLayoutEffect(() => {
    let isMounted = true;

    getTitleFromId().then((result) => {
      if (isMounted) {
        setTitle(result);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [getTitleFromId]);

  return title;
};
