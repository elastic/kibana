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
import { EventEmitter } from 'events';

import { Vis } from 'src/plugins/visualizations/public';
import { createEditorStateReducer, initEditorState, EditorVisState } from './reducers';
import { EditorStateActionTypes } from './constants';
import { EditorAction } from './actions';
import { useKibana } from '../../../../../kibana_react/public';
import { VisDefaultEditorKibanaServices } from '../../../types';

export * from './editor_form_state';
export * from './actions';

export function useEditorReducer(
  vis: Vis,
  eventEmitter: EventEmitter
): [EditorVisState, React.Dispatch<EditorAction>] {
  const { services } = useKibana<VisDefaultEditorKibanaServices>();
  const [state, dispatch] = useReducer(
    createEditorStateReducer(services.data.search),
    vis,
    initEditorState
  );

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
