/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { createContext, Dispatch, useReducer } from 'react';
import * as editor from '../../stores/editor';
import { DevToolsSettings } from '../../../services';
import { createUseContext } from '../create_use_context';

const EditorReadContext = createContext<editor.Store>(null as any);
const EditorActionContext = createContext<Dispatch<editor.Action>>(null as any);

export interface EditorContextArgs {
  children: any;
  settings: DevToolsSettings;
}

export function EditorContextProvider({ children, settings }: EditorContextArgs) {
  const [state, dispatch] = useReducer(editor.reducer, editor.initialValue, (value) => ({
    ...value,
    settings,
  }));
  return (
    <EditorReadContext.Provider value={state as any}>
      <EditorActionContext.Provider value={dispatch}>{children}</EditorActionContext.Provider>
    </EditorReadContext.Provider>
  );
}

export const useEditorReadContext = createUseContext(EditorReadContext, 'EditorReadContext');
export const useEditorActionContext = createUseContext(EditorActionContext, 'EditorActionContext');
