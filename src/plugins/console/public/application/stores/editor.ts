/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Reducer } from 'react';
import { produce } from 'immer';
import { identity } from 'fp-ts/lib/function';
import { DevToolsSettings, DEFAULT_SETTINGS } from '../../services';
import { TextObject } from '../../../common/text_object';
import { SenseEditor } from '../models';
import { SHELL_TAB_ID } from '../containers/main/constants';
import { MonacoEditorActionsProvider } from '../containers/editor/monaco/monaco_editor_actions_provider';

export interface Store {
  ready: boolean;
  settings: DevToolsSettings;
  currentTextObject: TextObject | null;
  currentView: string;
  restoreRequestFromHistory: string | null;
}

export const initialValue: Store = produce<Store>(
  {
    ready: false,
    settings: DEFAULT_SETTINGS,
    currentTextObject: null,
    currentView: SHELL_TAB_ID,
    restoreRequestFromHistory: null,
  },
  identity
);

export type Action =
  | { type: 'setInputEditor'; payload: SenseEditor | MonacoEditorActionsProvider }
  | { type: 'setCurrentTextObject'; payload: TextObject }
  | { type: 'updateSettings'; payload: DevToolsSettings }
  | { type: 'setCurrentView'; payload: string }
  | { type: 'setRequestToRestore'; payload: string }
  | { type: 'clearRequestToRestore' };

export const reducer: Reducer<Store, Action> = (state, action) =>
  produce<Store>(state, (draft) => {
    if (action.type === 'setInputEditor') {
      if (action.payload) {
        draft.ready = true;
      }
      return;
    }

    if (action.type === 'updateSettings') {
      draft.settings = action.payload;
      return;
    }

    if (action.type === 'setCurrentTextObject') {
      draft.currentTextObject = action.payload;
      return;
    }

    if (action.type === 'setRequestToRestore') {
      // Store the request and change the current view to the shell
      draft.restoreRequestFromHistory = action.payload;
      draft.currentView = SHELL_TAB_ID;
      return;
    }

    if (action.type === 'setCurrentView') {
      draft.currentView = action.payload;
      return;
    }

    if (action.type === 'clearRequestToRestore') {
      draft.restoreRequestFromHistory = null;
      return;
    }

    return draft;
  });
