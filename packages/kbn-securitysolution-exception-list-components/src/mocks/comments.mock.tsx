/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { Comment, CommentsArray } from '@kbn/securitysolution-io-ts-list-types';

export const getCommentsMock = (): Comment => ({
  comment: 'some old comment',
  created_at: '2020-04-20T15:25:31.830Z',
  created_by: 'some user',
  id: 'uuid_here',
});

export const getCommentsArrayMock = (): CommentsArray => [getCommentsMock(), getCommentsMock()];

export const mockGetFormattedComments = () =>
  getCommentsArrayMock().map((comment) => ({
    username: comment.created_by,
    children: <p>{comment.comment}</p>,
  }));
