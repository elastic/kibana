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

import { useCallback, useEffect, useReducer } from 'react';
import { editorStateReducer, initEditorState } from './reducers';
import { EditorStateActionTypes } from './constants';

export * from './actions';
// export * from './reducers';
export * from './editor_state_context';

export function useEditorReducer(vis) {
  const [state, dispatch] = useReducer(editorStateReducer, vis, initEditorState);

  const stateDispatch = useCallback(
    action => {
      vis.emit('dirtyStateChange', {
        isDirty: action.type !== EditorStateActionTypes.DISCARD_CHANGES,
      });

      dispatch(action);
    },
    [vis]
  );

  // useEffect(() => {
  //   vis.on('dirtyStateChange', ({ isDirty }) => {
  //     setDirty(isDirty);
  //   });
  // }, [vis]);

  return [state, stateDispatch];
}
