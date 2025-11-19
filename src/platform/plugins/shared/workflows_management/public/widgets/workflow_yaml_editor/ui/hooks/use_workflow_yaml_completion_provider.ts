/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import { monaco, YAML_LANG_ID } from '@kbn/monaco';
import type { WorkflowDetailState } from '../../../../entities/workflows/store';
import {
  selectDetail,
  selectEditorComputed,
} from '../../../../entities/workflows/store/workflow_detail/selectors';
import { getCompletionItemProvider } from '../../lib/autocomplete/get_completion_item_provider';

export const useWorkflowYamlCompletionProvider = (
  editor: monaco.editor.IStandaloneCodeEditor | null
): void => {
  const editorState = useSelector(selectDetail);
  const editorStateRef = useRef<WorkflowDetailState>(editorState);
  editorStateRef.current = editorState;

  const computed = useSelector(selectEditorComputed);

  // Create a new completion provider when the computed data changes to ensure we get the latest data
  // Computed data is calculations are debounced so we need to force an update when the computed data changes
  const completionProvider = useMemo(() => {
    if (!computed) {
      return undefined; // only happens on the initial state
    }
    return getCompletionItemProvider(() => editorStateRef.current);
  }, [computed]);

  // Register/unregister completion provider when completionProvider data changes
  const completionProviderDisposableRef = useRef<monaco.IDisposable | null>(null);
  useEffect(() => {
    if (!editor || !completionProvider) {
      return;
    }

    // Dispose previous registration if it exists
    if (completionProviderDisposableRef.current) {
      completionProviderDisposableRef.current.dispose();
      completionProviderDisposableRef.current = null;
    }

    const disposable = monaco.languages.registerCompletionItemProvider(
      YAML_LANG_ID,
      completionProvider
    );
    completionProviderDisposableRef.current = disposable;

    return () => {
      if (completionProviderDisposableRef.current) {
        completionProviderDisposableRef.current.dispose();
        completionProviderDisposableRef.current = null;
      }
    };
  }, [completionProvider, editor]);
};
