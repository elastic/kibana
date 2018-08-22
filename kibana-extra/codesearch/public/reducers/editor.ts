/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import produce from 'immer';
import { handleActions } from 'redux-actions';
import { Hover } from 'vscode-languageserver';
import {
  closeReferences,
  CodeAndLocation,
  findReferences,
  findReferencesFailed,
  findReferencesSuccess,
  hoverResult,
} from '../actions';

export interface EditorState {
  loading: boolean;
  showing: boolean;
  references: CodeAndLocation[];
  hover?: Hover;
  currentHover?: Hover;
}
const initialState: EditorState = {
  loading: false,
  showing: false,
  references: [],
};

export const editor = handleActions(
  {
    [String(findReferences)]: (state: EditorState) =>
      produce<EditorState>(state, draft => {
        draft.showing = true;
        draft.loading = true;
        draft.hover = state.currentHover;
      }),
    [String(findReferencesSuccess)]: (state: EditorState, action: any) =>
      produce<EditorState>(state, draft => {
        draft.references = action.payload;
        draft.loading = false;
      }),
    [String(findReferencesFailed)]: (state: EditorState) =>
      produce<EditorState>(state, draft => {
        draft.references = [];
        draft.loading = false;
        draft.showing = false;
      }),
    [String(closeReferences)]: (state: EditorState) =>
      produce<EditorState>(state, draft => {
        draft.showing = false;
      }),
    [String(hoverResult)]: (state: EditorState, action: any) =>
      produce<EditorState>(state, draft => {
        draft.currentHover = action.payload;
      }),
  },
  initialState
);
