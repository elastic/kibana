/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, Dispatch, useReducer } from 'react';
import * as editor from '../../stores/editor';
import { DevToolsSettings } from '../../../services';
import { createUseContext } from '../create_use_context';

const EditorReadContext = createContext<editor.Store>(editor.initialValue);
const EditorActionContext = createContext<Dispatch<editor.Action>>(() => {});

export interface EditorContextArgs {
  children: JSX.Element;
  settings: DevToolsSettings;
}

export function EditorContextProvider({ children, settings }: EditorContextArgs) {
  const [state, dispatch] = useReducer(editor.reducer, editor.initialValue, (value) => ({
    ...value,
    settings,
  }));
  return (
    <EditorReadContext.Provider value={state}>
      <EditorActionContext.Provider value={dispatch}>{children}</EditorActionContext.Provider>
    </EditorReadContext.Provider>
  );
}

export const useEditorReadContext = createUseContext(EditorReadContext, 'EditorReadContext');
export const useEditorActionContext = createUseContext(EditorActionContext, 'EditorActionContext');
