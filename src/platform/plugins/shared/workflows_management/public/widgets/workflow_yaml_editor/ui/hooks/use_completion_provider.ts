/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import { getCompletionItemProvider } from '../../lib/get_completion_item_provider';
import { selectDetailState } from '../../lib/store/selectors';
import type { WorkflowDetailState } from '../../lib/store/types';

export const useCompletionProvider = () => {
  const editorState = useSelector(selectDetailState);
  const editorStateRef = useRef<WorkflowDetailState>(editorState);
  editorStateRef.current = editorState;

  const completionProvider = useMemo(
    () => getCompletionItemProvider(() => editorStateRef.current),
    []
  );

  return completionProvider;
};
