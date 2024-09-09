/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Comment, CommentsArray } from '.';
import { DATE_NOW, ID, USER } from '../../constants/index.mock';

export const getCommentsMock = (): Comment => ({
  comment: 'some old comment',
  created_at: DATE_NOW,
  created_by: USER,
  id: ID,
});

export const getCommentsArrayMock = (): CommentsArray => [getCommentsMock(), getCommentsMock()];
