/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { createContext, Dispatch, useContext, useReducer } from 'react';
import { Action, reducer } from './reducer';
import { DevToolsSettings } from '../../../../services';

export interface ContextValue {
  editorsReady: boolean;
  settings: DevToolsSettings;
}

const EditorReadContext = createContext<ContextValue>(null as any);
const EditorActionContext = createContext<Dispatch<Action>>(null as any);

export interface EditorContextArgs {
  children: any;
  settings: DevToolsSettings;
}

const initialValue: ContextValue = {
  editorsReady: false,
  settings: null as any,
};

export function EditorContextProvider({ children, settings }: EditorContextArgs) {
  const [state, dispatch] = useReducer(reducer, initialValue, value => ({
    ...value,
    settings,
  }));
  return (
    <EditorReadContext.Provider value={state}>
      <EditorActionContext.Provider value={dispatch}>{children}</EditorActionContext.Provider>
    </EditorReadContext.Provider>
  );
}

export const useEditorActionContext = () => {
  const context = useContext(EditorActionContext);
  if (context === undefined) {
    throw new Error('useEditorActionContext must be used inside EditorActionContext');
  }
  return context;
};

export const useEditorReadContext = () => {
  const context = useContext(EditorReadContext);
  if (context === undefined) {
    throw new Error('useEditorReadContext must be used inside EditorContextProvider');
  }
  return context;
};
