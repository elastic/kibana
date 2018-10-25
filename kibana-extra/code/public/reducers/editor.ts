/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import produce from 'immer';
import { handleActions } from 'redux-actions';
import { Hover, TextDocumentPositionParams } from 'vscode-languageserver';
import {
  closeReferences,
  findReferences,
  findReferencesFailed,
  findReferencesSuccess,
  GroupedRepoReferences,
  hoverResult,
  revealPosition,
} from '../actions';

export interface EditorState {
  loading: boolean;
  showing: boolean;
  references: GroupedRepoReferences[];
  hover?: Hover;
  currentHover?: Hover;
  refPayload?: TextDocumentPositionParams;
  revealPosition?: Position;
}
const initialState: EditorState = {
  loading: false,
  showing: false,
  references: [],
};

export const editor = handleActions(
  {
    [String(findReferences)]: (state: EditorState, action: any) =>
      produce<EditorState>(state, draft => {
        draft.refPayload = action.payload;
        draft.showing = true;
        draft.loading = true;
        draft.references = initialState.references;
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
        draft.refPayload = undefined;
      }),
    [String(closeReferences)]: (state: EditorState) =>
      produce<EditorState>(state, draft => {
        draft.showing = false;
        draft.loading = false;
        draft.refPayload = undefined;
      }),
    [String(hoverResult)]: (state: EditorState, action: any) =>
      produce<EditorState>(state, draft => {
        draft.currentHover = action.payload;
      }),
    [String(revealPosition)]: (state: EditorState, action: any) =>
      produce<EditorState>(state, draft => {
        draft.revealPosition = action.payload;
      }),
  },
  initialState
);
