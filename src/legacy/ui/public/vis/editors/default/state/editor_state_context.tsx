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

import React, { createContext, useCallback, useContext, useState } from 'react';

interface EditorState {
  isDirty: boolean;
}

type setEditorState = (state: EditorState) => void;

const EditorStateContext = createContext<[EditorState, setEditorState]>([
  {} as EditorState,
  () => {},
]);

const EditorStateContextProvider = ({ children }: { children: React.ReactElement }) => {
  const [state, setState] = useState({ isDirty: false });

  return (
    <EditorStateContext.Provider value={[state, setState]}>{children}</EditorStateContext.Provider>
  );
};

const useEditorContext = () => {
  const [context, setContext] = useContext(EditorStateContext);

  const setDirty = useCallback((isDirty: boolean) => setContext({ ...context, isDirty }), [
    context,
  ]);

  return {
    ...context,
    setDirty,
  };
};

export { useEditorContext, EditorStateContextProvider };
