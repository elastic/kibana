/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useCallback } from 'react';
import { useEditorActionContext } from '../contexts/editor_context';
import { instance as registry } from '../contexts/editor_context/editor_registry';
import { SenseEditor } from '../models';
import { MonacoEditorActionsProvider } from '../containers/editor/monaco/monaco_editor_actions_provider';

export const useSetInputEditor = () => {
  const dispatch = useEditorActionContext();

  return useCallback(
    (editor: SenseEditor | MonacoEditorActionsProvider) => {
      dispatch({ type: 'setInputEditor', payload: editor });
      registry.setInputEditor(editor);
    },
    [dispatch]
  );
};
