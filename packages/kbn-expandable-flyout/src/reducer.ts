/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createReducer } from '@reduxjs/toolkit';
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
  goBackAction,
} from './actions';
import { initialState } from './state';

export const reducer = createReducer(initialState, (builder) => {
  builder.addCase(openPanelsAction, (state, { payload: { preview, left, right, id } }) => {
    const flyouState = { right, left, preview };
    if (id in state.byId) {
      state.byId[id].right = right;
      state.byId[id].left = left;
      state.byId[id].preview = preview ? [preview] : undefined;
      state.byId[id].history = [...state.byId[id].history, flyouState];
    } else {
      state.byId[id] = {
        left,
        right,
        preview: preview ? [preview] : undefined,
        history: [flyouState],
      };
    }

    state.needsSync = true;
  });

  builder.addCase(openLeftPanelAction, (state, { payload: { left, id } }) => {
    if (id in state.byId) {
      state.byId[id].left = left;

      const len = state.byId[id].history.length;
      if (len > 0) {
        const lastFlyout = state.byId[id].history[len - 1];
        state.byId[id].history = [
          ...state.byId[id].history.slice(0, len - 1),
          {
            right: lastFlyout.right,
            left,
            preview: lastFlyout.preview,
          },
        ];
      }
    } else {
      state.byId[id] = {
        left,
        right: undefined,
        preview: undefined,
        history: [],
      };
    }

    state.needsSync = true;
  });

  builder.addCase(openRightPanelAction, (state, { payload: { right, id } }) => {
    if (id in state.byId) {
      state.byId[id].right = right;

      const len = state.byId[id].history.length;
      if (len > 0) {
        const lastFlyout = state.byId[id].history[len - 1];
        state.byId[id].history = [
          ...state.byId[id].history.slice(0, len - 1),
          {
            right,
            left: lastFlyout.left,
            preview: lastFlyout.preview,
          },
        ];
      }
    } else {
      state.byId[id] = {
        right,
        left: undefined,
        preview: undefined,
        history: [],
      };
    }

    state.needsSync = true;
  });

  builder.addCase(openPreviewPanelAction, (state, { payload: { preview, id } }) => {
    if (id in state.byId) {
      if (state.byId[id].preview) {
        state.byId[id].preview?.push(preview);
      } else {
        state.byId[id].preview = preview ? [preview] : undefined;
      }

      const len = state.byId[id].history.length;
      if (len > 0) {
        const lastFlyout = state.byId[id].history[len - 1];
        state.byId[id].history = [
          ...state.byId[id].history.slice(0, len - 1),
          {
            right: lastFlyout.right,
            left: lastFlyout.left,
            preview,
          },
        ];
      }
    } else {
      state.byId[id] = {
        right: undefined,
        left: undefined,
        preview: preview ? [preview] : undefined,
        history: [],
      };
    }

    state.needsSync = true;
  });

  builder.addCase(previousPreviewPanelAction, (state, { payload: { id } }) => {
    if (id in state.byId) {
      state.byId[id].preview?.pop();

      // const currentPreview = state.byId[id].preview?.[-1];
      // if (state.byId[id].history.length > 0 && currentPreview) {
      //   state.byId[id].history[-1].preview = currentPreview;
      // }
    }

    state.needsSync = true;
  });

  builder.addCase(closePanelsAction, (state, { payload: { id } }) => {
    if (id in state.byId) {
      state.byId[id].right = undefined;
      state.byId[id].left = undefined;
      state.byId[id].preview = undefined;
      state.byId[id].history = [];
    }

    state.needsSync = true;
  });

  builder.addCase(closeLeftPanelAction, (state, { payload: { id } }) => {
    if (id in state.byId) {
      state.byId[id].left = undefined;

      const len = state.byId[id].history.length;
      if (len > 0) {
        const lastFlyout = state.byId[id].history[len - 1];
        state.byId[id].history = [
          ...state.byId[id].history.slice(0, len - 1),
          {
            right: lastFlyout.right,
            left: undefined,
            preview: lastFlyout.preview,
          },
        ];
      }
    }

    state.needsSync = true;
  });

  builder.addCase(closeRightPanelAction, (state, { payload: { id } }) => {
    if (id in state.byId) {
      state.byId[id].right = undefined;

      const len = state.byId[id].history.length;
      if (len > 0) {
        const lastFlyout = state.byId[id].history[len - 1];
        state.byId[id].history = [
          ...state.byId[id].history.slice(0, len - 1),
          {
            right: undefined,
            left: lastFlyout.left,
            preview: lastFlyout.preview,
          },
        ];
      }
    }

    state.needsSync = true;
  });

  builder.addCase(closePreviewPanelAction, (state, { payload: { id } }) => {
    if (id in state.byId) {
      state.byId[id].preview = undefined;

      const len = state.byId[id].history.length;
      if (len > 0) {
        const lastFlyout = state.byId[id].history[len - 1];
        state.byId[id].history = [
          ...state.byId[id].history.slice(0, len - 1),
          {
            right: lastFlyout.right,
            left: lastFlyout.left,
            preview: undefined,
          },
        ];
      }
    }

    state.needsSync = true;
  });

  builder.addCase(urlChangedAction, (state, { payload: { preview, left, right, id } }) => {
    // if (id in state.byId) {
    //   state.byId[id].right = right;
    //   state.byId[id].left = left;
    //   state.byId[id].preview = preview ? [preview] : undefined;
    // } else {
    //   state.byId[id] = {
    //     right,
    //     left,
    //     preview: preview ? [preview] : undefined,
    //     history: right || left || preview ? [{ right, left, preview }] : [],
    //   };
    // }

    state.needsSync = false;
  });

  builder.addCase(goBackAction, (state, { payload: { id } }) => {
    if (id in state.byId && state.byId[id].history.length > 1) {
      state.byId[id].history?.pop();

      const lastFlyout = state.byId[id].history[state.byId[id].history.length - 1];
      state.byId[id].right = lastFlyout.right;
      state.byId[id].left = lastFlyout.left;
      state.byId[id].preview = lastFlyout.preview ? [lastFlyout.preview] : undefined;

      state.needsSync = true;
    }
  });
});
