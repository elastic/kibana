/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Dispatch } from 'react';
import React, { createContext, useReducer } from 'react';
import * as editor from '../../stores/editor';
import type { DevToolsSettings } from '../../../services';
import { createUseContext } from '../create_use_context';

const EditorReadContext = createContext<editor.Store>(editor.initialValue);
const EditorActionContext = createContext<Dispatch<editor.Action>>(() => {});

export interface EditorContextArgs {
  children: JSX.Element;
  settings: DevToolsSettings;
  customParsedRequestsProvider?: (model: any) => any;
}

export function EditorContextProvider({
  children,
  settings,
  customParsedRequestsProvider,
}: EditorContextArgs) {
  const [state, dispatch] = useReducer(editor.reducer, editor.initialValue, (value) => ({
    ...value,
    settings,
    customParsedRequestsProvider,
  }));
  return (
    <EditorReadContext.Provider value={state}>
      <EditorActionContext.Provider value={dispatch}>{children}</EditorActionContext.Provider>
    </EditorReadContext.Provider>
  );
}

export const useEditorReadContext = createUseContext(EditorReadContext, 'EditorReadContext');
export const useEditorActionContext = createUseContext(EditorActionContext, 'EditorActionContext');
