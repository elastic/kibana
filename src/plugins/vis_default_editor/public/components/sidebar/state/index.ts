/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EventEmitter } from 'events';
import { useCallback, useReducer } from 'react';

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { Vis } from '@kbn/visualizations-plugin/public';
import { VisDefaultEditorKibanaServices } from '../../../types';
import { EditorAction } from './actions';
import { EditorStateActionTypes } from './constants';
import { EditorVisState, createEditorStateReducer, initEditorState } from './reducers';

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
