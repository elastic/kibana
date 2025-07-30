/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  CreateIn,
  CreateResult,
  GetIn,
  GetResult,
  UpdateIn,
  UpdateResult,
} from '@kbn/content-management-plugin/common';
import type { BookState } from '../../../server';
import { contentManagement } from '../../kibana_services';
import { BOOK_CONTENT_ID } from '../../../common';

type BookContentType = typeof BOOK_CONTENT_ID;

export async function loadBook(id: string) {
  const { item } = await contentManagement.client.get<GetIn<BookContentType>, GetResult<BookState>>(
    {
      contentTypeId: BOOK_CONTENT_ID,
      id,
    }
  );
  return item;
}

export async function saveBook(maybeId: string | undefined, bookState: BookState) {
  const {
    meta: { id },
  } = maybeId
    ? await contentManagement.client.update<
        UpdateIn<BookContentType, BookState>,
        UpdateResult<BookState, { id: string }>
      >({
        contentTypeId: BOOK_CONTENT_ID,
        id: maybeId,
        data: bookState,
      })
    : await contentManagement.client.create<
        CreateIn<BookContentType, BookState>,
        CreateResult<BookState, { id: string }>
      >({
        contentTypeId: BOOK_CONTENT_ID,
        data: bookState,
      });
  return id;
}
