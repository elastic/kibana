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

import { useEffect, useReducer, useCallback } from 'react';
import { isEqual } from 'lodash';
import { EventEmitter } from 'events';

import { Vis, VisParams } from 'src/legacy/core_plugins/visualizations/public';
import { editorStateReducer, initEditorState, EditorVisState } from './reducers';
import { EditorStateActionTypes } from './constants';
import { EditorAction, updateStateParams } from './actions';

export * from './editor_form_state';
export * from './actions';

export function useEditorReducer(
  vis: Vis,
  eventEmitter: EventEmitter
): [EditorVisState, React.Dispatch<EditorAction>] {
  const [state, dispatch] = useReducer(editorStateReducer, vis, initEditorState);

  useEffect(() => {
    const handleVisUpdate = (params: VisParams) => {
      if (!isEqual(params, state.params)) {
        dispatch(updateStateParams(params));
      }
    };

    // fires when visualization state changes, and we need to copy changes to editorState
    eventEmitter.on('updateEditorStateParams', handleVisUpdate);

    return () => {
      eventEmitter.off('updateEditorStateParams', handleVisUpdate);
    };
  }, [eventEmitter, state.params]);

  const wrappedDispatch = useCallback(
    (action: EditorAction) => {
      dispatch(action);

      eventEmitter.emit('dirtyStateChange', {
        isDirty: action.type !== EditorStateActionTypes.DISCARD_CHANGES,
      });
    },
    [eventEmitter]
  );

  return [state, wrappedDispatch];
}
