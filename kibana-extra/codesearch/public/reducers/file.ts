/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import produce from 'immer';
import { Action, handleActions } from 'redux-actions';
import { FileTree, FileTreeItemType } from '../../model';
import {
  closeTreePath,
  fetchRepoTree,
  fetchRepoTreeFailed,
  fetchRepoTreeSuccess,
  openTreePath,
} from '../actions';

export interface FileState {
  tree: FileTree;
  loading: boolean;
  openedPaths: string[];
}

const initialState: FileState = {
  tree: {
    name: '',
    path: '',
    children: undefined,
    type: FileTreeItemType.Directory,
  },
  openedPaths: [],
  loading: false,
};

function mergeTree(draft: FileState, update: FileTree) {
  if (update.path) {
    const pathSegments = update.path.split('/');
    let current = draft.tree;
    pathSegments.forEach((p, pidx) => {
      if (current.children == null) {
        current.children = [];
      }
      current.children.map((child, idx) => {
        if (child.name === p) {
          if (pidx === pathSegments.length - 1) {
            current.children![idx] = update;
          }
          current = child;
        }
      });
    });
  } else {
    // it's root
    draft.tree = update;
  }
}

export const file = handleActions(
  {
    [String(fetchRepoTree)]: (state: FileState) =>
      produce(state, draft => {
        draft.loading = true;
      }),
    [String(fetchRepoTreeSuccess)]: (state: FileState, action: Action<FileTree>) =>
      produce<FileState>(state, draft => {
        draft.loading = false;
        const update = action.payload!;
        mergeTree(draft, update);
        const path = update.path!;
        if (draft.openedPaths.indexOf(path) < 0) {
          draft.openedPaths.push(path);
        }
      }),
    [String(fetchRepoTreeFailed)]: (state: FileState) =>
      produce(state, draft => {
        draft.loading = false;
      }),
    [String(openTreePath)]: (state: FileState, action: any) =>
      produce<FileState>(state, draft => {
        const path = action.payload!;
        if (!state.openedPaths.includes(path)) {
          draft.openedPaths.push(path);
        }
      }),
    [String(closeTreePath)]: (state: FileState, action: any) =>
      produce<FileState>(state, draft => {
        const idx = state.openedPaths.indexOf(action.payload!);
        if (idx >= 0) {
          draft.openedPaths.splice(idx, 1);
        }
      }),
  },
  initialState
);
