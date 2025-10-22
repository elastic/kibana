/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useSelector } from 'react-redux';
import { useMemo, useRef } from 'react';
import type { WorkflowEditorState } from '../../lib/store';
import { selectWorkflowEditorState } from '../../lib/store';
import { getCompletionItemProvider } from '../../lib/get_completion_item_provider';

export const useCompletionProvider = () => {
  const editorState = useSelector(selectWorkflowEditorState);
  const editorStateRef = useRef<WorkflowEditorState>(editorState);
  editorStateRef.current = editorState;

  const completionProvider = useMemo(
    () => getCompletionItemProvider(() => editorStateRef.current),
    []
  );

  return completionProvider;
};
