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

import { useMemo, useReducer } from 'react';
import { Vis, VisState } from 'ui/vis';
import { editorStateReducer, initEditorState } from './reducers';
import { EditorStateActionTypes } from './constants';
import { editorActions, EditorActions } from './actions';

export * from './editor_state_context';

export function useEditorReducer(vis: Vis): [VisState, EditorActions] {
  const [state, dispatch] = useReducer(editorStateReducer, vis, initEditorState);

  const actions = useMemo(
    () =>
      (Object.keys(editorActions) as Array<keyof EditorActions>).reduce<EditorActions>(
        (wrappedDispatchActions, actionCreator) => {
          wrappedDispatchActions[actionCreator] = (...params: any) => {
            const action = editorActions[actionCreator](...params);

            vis.emit('dirtyStateChange', {
              isDirty: action.type !== EditorStateActionTypes.DISCARD_CHANGES,
            });

            dispatch(action);
          };

          return wrappedDispatchActions;
        },
        {} as EditorActions
      ),
    [vis]
  );

  return [state, actions];
}
