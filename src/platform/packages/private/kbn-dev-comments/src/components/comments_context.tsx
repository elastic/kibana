/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, useContext, useMemo, type PropsWithChildren } from 'react';
import type { CommentsController, CommentsState } from '../state/comments_controller';
import { useStore } from '../state/store';
import type { Comment } from '../types';

const CommentsContext = createContext<CommentsController | null>(null);

export const CommentsProvider = ({
  controller,
  children,
}: PropsWithChildren<{ controller: CommentsController }>) => (
  <CommentsContext.Provider value={controller}>{children}</CommentsContext.Provider>
);

export const useComments = (): CommentsController => {
  const controller = useContext(CommentsContext);
  if (!controller) {
    throw new Error('useComments must be used inside an CommentsProvider');
  }
  return controller;
};

export const useCommentsState = <S,>(selector: (state: CommentsState) => S): S =>
  useStore(useComments().store, selector);

/** Comments made on the current page. */
export const usePageComments = (): Comment[] => {
  const comments = useCommentsState((state) => state.comments);
  const pageKey = useCommentsState((state) => state.pageKey);
  return useMemo(
    () => comments.filter((comment) => comment.route.pageKey === pageKey),
    [comments, pageKey]
  );
};
