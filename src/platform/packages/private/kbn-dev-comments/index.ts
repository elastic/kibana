/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { CommentsButton, type CommentsButtonProps } from './src/components/comments_button';
export { getEffectiveBackgroundColor } from './src/lib/snapshot';
export { isSafeRelativePath } from './src/lib/route';
export { IGNORE_ATTR } from './src/constants';
export type {
  AnchorLocator,
  AnchorTarget,
  Comment,
  CommentAuthor,
  CommentPatch,
  CommentReply,
  CommentRoute,
  CommentSnapshot,
  CommentsApi,
  CommentsExport,
  CommentsImportResult,
  CommentsHostServices,
  CommentsLocationService,
  CommentsUser,
  ElementAnchor,
  NewComment,
  TrailStep,
} from './src/types';
