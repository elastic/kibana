/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { useCallback } from 'react';
import { useEditorActionContext } from '../contexts/editor_context';
import { instance as registry } from '../contexts/editor_context/editor_registry';

export const useSetInputEditor = () => {
  const dispatch = useEditorActionContext();

  return useCallback(
    (editor: any) => {
      dispatch({ type: 'setInputEditor', payload: editor });
      registry.setInputEditor(editor);
    },
    [dispatch]
  );
};
