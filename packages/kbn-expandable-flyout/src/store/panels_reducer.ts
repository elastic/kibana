/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createReducer } from '@reduxjs/toolkit';
import deepEqual from 'react-fast-compare';
import {
  openPanelsAction,
  openLeftPanelAction,
  openRightPanelAction,
  closePanelsAction,
  closeLeftPanelAction,
  closePreviewPanelAction,
  closeRightPanelAction,
  previousPreviewPanelAction,
  openPreviewPanelAction,
  urlChangedAction,
} from './panels_actions';
import { initialState } from './panels_state';

export const panelsReducer = createReducer(initialState, (builder) => {
  builder.addCase(openPanelsAction, (state, { payload: { preview, left, right, id } }) => {
    if (id in state.panelsById) {
      state.panelsById[id].right = right;
      state.panelsById[id].left = left;
      state.panelsById[id].preview = preview ? [preview] : undefined;
    } else {
      state.panelsById[id] = {
        left,
        right,
        preview: preview ? [preview] : undefined,
      };
    }

    state.needsSync = true;
  });

  builder.addCase(openLeftPanelAction, (state, { payload: { left, id } }) => {
    if (id in state.panelsById) {
      state.panelsById[id].left = left;
    } else {
      state.panelsById[id] = {
        left,
        right: undefined,
        preview: undefined,
      };
    }

    state.needsSync = true;
  });

  builder.addCase(openRightPanelAction, (state, { payload: { right, id } }) => {
    if (id in state.panelsById) {
      state.panelsById[id].right = right;
    } else {
      state.panelsById[id] = {
        right,
        left: undefined,
        preview: undefined,
      };
    }

    state.needsSync = true;
  });

  builder.addCase(openPreviewPanelAction, (state, { payload: { preview, id } }) => {
    if (id in state.panelsById) {
      if (state.panelsById[id].preview) {
        const previewIdenticalToLastOne = deepEqual(preview, state.panelsById[id].preview?.at(-1));
        // Only append preview when it does not match the last item in state.panelsById[id].preview
        if (!previewIdenticalToLastOne) {
          state.panelsById[id].preview?.push(preview);
        }
      } else {
        state.panelsById[id].preview = preview ? [preview] : undefined;
      }
    } else {
      state.panelsById[id] = {
        right: undefined,
        left: undefined,
        preview: preview ? [preview] : undefined,
      };
    }

    state.needsSync = true;
  });

  builder.addCase(previousPreviewPanelAction, (state, { payload: { id } }) => {
    if (id in state.panelsById) {
      state.panelsById[id].preview?.pop();
    }

    // if state is stored in url, click go back in preview should utilize browser history
    state.needsSync = false;
  });

  builder.addCase(closePanelsAction, (state, { payload: { id } }) => {
    if (id in state.panelsById) {
      state.panelsById[id].right = undefined;
      state.panelsById[id].left = undefined;
      state.panelsById[id].preview = undefined;
    }

    state.needsSync = true;
  });

  builder.addCase(closeLeftPanelAction, (state, { payload: { id } }) => {
    if (id in state.panelsById) {
      state.panelsById[id].left = undefined;
    }

    state.needsSync = true;
  });

  builder.addCase(closeRightPanelAction, (state, { payload: { id } }) => {
    if (id in state.panelsById) {
      state.panelsById[id].right = undefined;
    }

    state.needsSync = true;
  });

  builder.addCase(closePreviewPanelAction, (state, { payload: { id } }) => {
    if (id in state.panelsById) {
      state.panelsById[id].preview = undefined;
    }

    state.needsSync = true;
  });

  builder.addCase(urlChangedAction, (state, { payload: { preview, left, right, id } }) => {
    if (id in state.panelsById) {
      state.panelsById[id].right = right;
      state.panelsById[id].left = left;
      state.panelsById[id].preview = preview ? [preview] : undefined;
    } else {
      state.panelsById[id] = {
        right,
        left,
        preview: preview ? [preview] : undefined,
      };
    }

    state.needsSync = false;
  });
});
