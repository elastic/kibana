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

import React, { createContext, useState, Dispatch, SetStateAction } from 'react';
import { DevToolsSettings } from '../../../services';
import { createUseContext } from '../create_use_context';

export interface EditorContextArgs {
  children: any;
  settings: DevToolsSettings;
}

interface EditorContextState {
  ready: boolean;
  settings: DevToolsSettings;
}

const EditorContext = createContext<
  [EditorContextState, Dispatch<SetStateAction<EditorContextState>>]
>(undefined as any);

const initialState: EditorContextState = {
  ready: false,
  settings: null as any,
};

export function EditorContextProvider({ children, settings }: EditorContextArgs) {
  const [state, setState] = useState<EditorContextState>({ ...initialState, settings });
  return <EditorContext.Provider value={[state, setState]}>{children}</EditorContext.Provider>;
}

export const useEditorContext = createUseContext(EditorContext, 'EditorContext');
