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
} from './actions';
import { initialState } from './state';

export const reducer = createReducer(initialState, (builder) => {
  builder.addCase(openPanelsAction, (state, { payload: { preview, left, right, id } }) => {
    if (id in state.byId) {
      state.byId[id].right = right;
      state.byId[id].left = left;
      state.byId[id].preview = preview ? [preview] : undefined;
    } else {
      state.byId[id] = {
        left,
        right,
        preview: preview ? [preview] : undefined,
      };
    }

    state.needsSync = true;
  });

  builder.addCase(openLeftPanelAction, (state, { payload: { left, id } }) => {
    if (id in state.byId) {
      state.byId[id].left = left;
    } else {
      state.byId[id] = {
        left,
        right: undefined,
        preview: undefined,
      };
    }

    state.needsSync = true;
  });

  builder.addCase(openRightPanelAction, (state, { payload: { right, id } }) => {
    if (id in state.byId) {
      state.byId[id].right = right;
    } else {
      state.byId[id] = {
        right,
        left: undefined,
        preview: undefined,
      };
    }

    state.needsSync = true;
  });

  builder.addCase(openPreviewPanelAction, (state, { payload: { preview, id } }) => {
    if (id in state.byId) {
      if (state.byId[id].preview) {
        const previewIdenticalToLastOne = deepEqual(preview, state.byId[id].preview?.at(-1));
        // Only append preview when it does not match the last item in state.byId[id].preview
        if (!previewIdenticalToLastOne) {
          state.byId[id].preview?.push(preview);
        }
      } else {
        state.byId[id].preview = preview ? [preview] : undefined;
      }
    } else {
      state.byId[id] = {
        right: undefined,
        left: undefined,
        preview: preview ? [preview] : undefined,
      };
    }

    state.needsSync = true;
  });

  builder.addCase(previousPreviewPanelAction, (state, { payload: { id } }) => {
    if (id in state.byId) {
      state.byId[id].preview?.pop();
    }

    // if state is stored in url, click go back in preview should utilize browser history
    state.needsSync = false;
  });

  builder.addCase(closePanelsAction, (state, { payload: { id } }) => {
    if (id in state.byId) {
      state.byId[id].right = undefined;
      state.byId[id].left = undefined;
      state.byId[id].preview = undefined;
    }

    state.needsSync = true;
  });

  builder.addCase(closeLeftPanelAction, (state, { payload: { id } }) => {
    if (id in state.byId) {
      state.byId[id].left = undefined;
    }

    state.needsSync = true;
  });

  builder.addCase(closeRightPanelAction, (state, { payload: { id } }) => {
    if (id in state.byId) {
      state.byId[id].right = undefined;
    }

    state.needsSync = true;
  });

  builder.addCase(closePreviewPanelAction, (state, { payload: { id } }) => {
    if (id in state.byId) {
      state.byId[id].preview = undefined;
    }

    state.needsSync = true;
  });

  builder.addCase(urlChangedAction, (state, { payload: { preview, left, right, id } }) => {
    if (id in state.byId) {
      state.byId[id].right = right;
      state.byId[id].left = left;
      state.byId[id].preview = preview ? [preview] : undefined;
    } else {
      state.byId[id] = {
        right,
        left,
        preview: preview ? [preview] : undefined,
      };
    }

    state.needsSync = false;
  });
});
