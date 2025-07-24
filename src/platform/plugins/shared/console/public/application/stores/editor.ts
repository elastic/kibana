/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Reducer } from 'react';
import { cloneDeep } from 'lodash';
import { DevToolsSettings, DEFAULT_SETTINGS } from '../../services';
import { TextObject } from '../../../common/text_object';
import { SHELL_TAB_ID } from '../containers/main/constants';
import { MonacoEditorActionsProvider } from '../containers/editor/monaco_editor_actions_provider';
import { RequestToRestore } from '../../types';

export interface Store {
  ready: boolean;
  settings: DevToolsSettings;
  currentTextObject: TextObject | null;
  currentView: string;
  restoreRequestFromHistory: RequestToRestore | null;
  fileToImport: string | null;
}

export const initialValue: Store = {
  ready: false,
  settings: DEFAULT_SETTINGS,
  currentTextObject: null,
  currentView: SHELL_TAB_ID,
  restoreRequestFromHistory: null,
  fileToImport: null,
};

export type Action =
  | { type: 'setInputEditor'; payload: MonacoEditorActionsProvider }
  | { type: 'setCurrentTextObject'; payload: TextObject }
  | { type: 'updateSettings'; payload: DevToolsSettings }
  | { type: 'setCurrentView'; payload: string }
  | { type: 'setRequestToRestore'; payload: RequestToRestore }
  | { type: 'clearRequestToRestore' }
  | { type: 'setFileToImport'; payload: string | null };

export const reducer: Reducer<Store, Action> = (state, action) => {
  const draft = cloneDeep(state);

  if (action.type === 'setInputEditor') {
    if (action.payload) {
      draft.ready = true;
    }
    return draft;
  }

  if (action.type === 'updateSettings') {
    draft.settings = action.payload;
    return draft;
  }

  if (action.type === 'setCurrentTextObject') {
    draft.currentTextObject = action.payload;
    return draft;
  }

  if (action.type === 'setRequestToRestore') {
    // Store the request and change the current view to the shell
    draft.restoreRequestFromHistory = action.payload;
    draft.currentView = SHELL_TAB_ID;
    return draft;
  }

  if (action.type === 'setCurrentView') {
    draft.currentView = action.payload;
    return draft;
  }

  if (action.type === 'clearRequestToRestore') {
    draft.restoreRequestFromHistory = null;
    return draft;
  }

  if (action.type === 'setFileToImport') {
    draft.fileToImport = action.payload;
    return draft;
  }

  return state;
};
