/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpSetup } from '@kbn/core/public';
import { buildPath, type IHttpFetchError, type ResponseErrorBody } from '@kbn/core-http-browser';
import { COMMENTS_API_PATH, type Comment, type CommentSnapshot, type CommentsApi } from '../common';

const explained = async <T>(request: Promise<T>): Promise<T> => {
  try {
    return await request;
  } catch (error) {
    const message = (error as IHttpFetchError<ResponseErrorBody>).body?.message;
    throw message ? new Error(message) : error;
  }
};

export const createCommentsApi = (http: HttpSetup): CommentsApi => ({
  list: () => explained(http.get<Comment[]>(COMMENTS_API_PATH)),

  getSnapshot: (id) =>
    explained(http.get<CommentSnapshot>(buildPath(`${COMMENTS_API_PATH}/{id}/snapshot`, { id }))),

  create: (input) =>
    explained(http.post<Comment>(COMMENTS_API_PATH, { body: JSON.stringify(input) })),

  update: (id, patch) =>
    explained(
      http.patch<Comment>(buildPath(`${COMMENTS_API_PATH}/{id}`, { id }), {
        body: JSON.stringify(patch),
      })
    ),
});
