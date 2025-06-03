/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ContentClient, ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import {
  CreateResult,
  CreateIn,
  GetIn,
  GetResult,
  UpdateIn,
  UpdateResult,
} from '@kbn/content-management-plugin/common';
import { BOOK_CONTENT_ID } from '../../../common/book/content_management/schema';
import { BookItem, BookSavedObject } from './types';

type BookContentType = typeof BOOK_CONTENT_ID;

class SavedBookClient {
  private client: ContentClient;
  constructor(contentManagement: ContentManagementPublicStart) {
    this.client = contentManagement.client;
  }
  save(attributes: BookItem, id?: string) {
    if (id)
      return this.client.update<
        UpdateIn<BookContentType, BookItem>,
        UpdateResult<BookSavedObject, { id: string }>
      >({
        contentTypeId: BOOK_CONTENT_ID,
        id,
        data: attributes,
      });
    else
      return this.client.create<
        CreateIn<BookContentType, BookItem>,
        CreateResult<BookSavedObject, { id: string }>
      >({
        contentTypeId: BOOK_CONTENT_ID,
        data: attributes,
      });
  }
  load(id: string): Promise<GetResult<BookItem>> {
    return this.client.get<GetIn<BookContentType>, GetResult<BookItem>>({
      contentTypeId: BOOK_CONTENT_ID,
      id,
    });
  }
}

export const loadBookAttributes = async (
  contentManagement: ContentManagementPublicStart,
  id: string
): Promise<BookItem> => {
  const client = new SavedBookClient(contentManagement);
  const { item } = await client.load(id);
  return item;
};

export const saveBookAttributes = async (
  contentManagement: ContentManagementPublicStart,
  maybeId: string | undefined,
  attributes: BookItem
): Promise<string> => {
  const client = new SavedBookClient(contentManagement);
  const {
    meta: { id },
  } = await client.save(attributes, maybeId);
  return id;
};
