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

import { useReducer, useCallback } from 'react';
import { Vis, VisState } from 'ui/vis';
import { editorStateReducer, initEditorState } from './reducers';
import { EditorStateActionTypes } from './constants';
import { EditorAction } from './actions';

export * from './editor_state_context';

export function useEditorReducer(vis: Vis): [VisState, React.Dispatch<EditorAction>] {
  const [state, dispatch] = useReducer(editorStateReducer, vis, initEditorState);

  const wrappedDispatch = useCallback(
    (action: EditorAction) => {
      vis.emit('dirtyStateChange', {
        isDirty: action.type !== EditorStateActionTypes.DISCARD_CHANGES,
      });

      dispatch(action);
    },
    [vis]
  );

  return [state, wrappedDispatch];
}
