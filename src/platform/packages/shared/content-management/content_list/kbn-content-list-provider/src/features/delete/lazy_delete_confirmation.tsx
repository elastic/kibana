/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { lazy, Suspense } from 'react';
import { useContentListState } from '../../state/use_content_list_state';

const DeleteConfirmationLazy = lazy(() =>
  import('./delete_confirmation').then(({ DeleteConfirmation }) => ({
    default: DeleteConfirmation,
  }))
);

/**
 * Lightweight wrapper that checks `state.deleteRequest` before `React.lazy`-loading
 * the real {@link DeleteConfirmation} modal. Returns `null` when no delete is pending,
 * avoiding any bundle cost until a delete is actually requested.
 *
 * @internal Rendered by `ContentListProvider` when `supports.delete` is `true`.
 */
export const LazyDeleteConfirmation = () => {
  const { state } = useContentListState();

  if (!state.deleteRequest) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <DeleteConfirmationLazy />
    </Suspense>
  );
};
