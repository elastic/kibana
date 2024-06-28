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
import { MonacoEditorActionsProvider } from '../containers/editor/monaco/monaco_editor_actions_provider';

export interface Store {
  ready: boolean;
  settings: DevToolsSettings;
  currentTextObject: TextObject | null;
}

export const initialValue: Store = produce<Store>(
  {
    ready: false,
    settings: DEFAULT_SETTINGS,
    currentTextObject: null,
  },
  identity
);

export type Action =
  | { type: 'setInputEditor'; payload: SenseEditor | MonacoEditorActionsProvider }
  | { type: 'setCurrentTextObject'; payload: TextObject }
  | { type: 'updateSettings'; payload: DevToolsSettings };

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

    return draft;
  });
