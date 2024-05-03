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
  defaultWidthsInitialState,
  internalPercentagesInitialState,
  panelsState,
  pushVsOverlayInitialState,
  widthsInitialState,
} from './state';
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
  changeInternalPercentagesAction,
  resetInternalPercentagesAction,
  changePushVsOverlayAction,
  setDefaultWidthsAction,
  changeCollapsedWidthAction,
  resetCollapsedWidthAction,
  changeExpandedWidthAction,
  resetExpandedWidthAction,
} from './actions';

export const panelsReducer = createReducer(panelsState, (builder) => {
  builder.addCase(openPanelsAction, (state, { payload: { preview, left, right, id } }) => {
    console.log('render - openPanelsAction', right);
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
    console.log('render - openLeftPanelAction', left);
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
    console.log('render - openRightPanelAction', right);
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
    console.log('render - openPreviewPanelAction', preview);
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
    console.log('render - closePanelsAction');
    if (id in state.panelsById) {
      state.panelsById[id].right = undefined;
      state.panelsById[id].left = undefined;
      state.panelsById[id].preview = undefined;
    }

    state.needsSync = true;
  });

  builder.addCase(closeLeftPanelAction, (state, { payload: { id } }) => {
    console.log('render - closeLeftPanelAction');
    if (id in state.panelsById) {
      state.panelsById[id].left = undefined;
    }

    state.needsSync = true;
  });

  builder.addCase(closeRightPanelAction, (state, { payload: { id } }) => {
    console.log('render - closeRightPanelAction');
    if (id in state.panelsById) {
      state.panelsById[id].right = undefined;
    }

    state.needsSync = true;
  });

  builder.addCase(closePreviewPanelAction, (state, { payload: { id } }) => {
    console.log('render - closePreviewPanelAction');
    if (id in state.panelsById) {
      state.panelsById[id].preview = undefined;
    }

    state.needsSync = true;
  });

  builder.addCase(urlChangedAction, (state, { payload: { preview, left, right, id } }) => {
    console.log('render - urlChangedAction', left, right, preview);
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

export const pushVsOverlayReducer = createReducer(pushVsOverlayInitialState, (builder) => {
  builder.addCase(changePushVsOverlayAction, (state, { payload: { type, id } }) => {
    state.pushVsOverlayById[id] = type;
  });
});

export const defaultWidthsReducer = createReducer(defaultWidthsInitialState, (builder) => {
  builder.addCase(setDefaultWidthsAction, (state, { payload: { right, left, preview } }) => {
    state.defaultWidths.rightWidth = right;
    state.defaultWidths.leftWidth = left;
    state.defaultWidths.previewWidth = preview;
    state.defaultWidths.rightPercentage = (right / (right + left)) * 100;
    state.defaultWidths.leftPercentage = (left / (right + left)) * 100;
    state.defaultWidths.previewPercentage = (right / (right + left)) * 100;
  });
});

export const widthsReducer = createReducer(widthsInitialState, (builder) => {
  builder.addCase(changeCollapsedWidthAction, (state, { payload: { width, id } }) => {
    if (id in state.widthsById) {
      state.widthsById[id].collapsedWidth = width;
    } else {
      state.widthsById[id] = {
        collapsedWidth: width,
      };
    }
  });

  builder.addCase(resetCollapsedWidthAction, (state, { payload: { id } }) => {
    if (id in state.widthsById) {
      state.widthsById[id].collapsedWidth = undefined;
    } else {
      state.widthsById[id] = {
        collapsedWidth: undefined,
      };
    }
  });

  builder.addCase(changeExpandedWidthAction, (state, { payload: { width, id } }) => {
    if (id in state.widthsById) {
      state.widthsById[id].expandedWidth = width;
    } else {
      state.widthsById[id] = {
        expandedWidth: width,
      };
    }
  });

  builder.addCase(resetExpandedWidthAction, (state, { payload: { id } }) => {
    if (id in state.widthsById) {
      state.widthsById[id].expandedWidth = undefined;
    } else {
      state.widthsById[id] = {
        expandedWidth: undefined,
      };
    }
  });
});

export const internalPercentagesReducer = createReducer(
  internalPercentagesInitialState,
  (builder) => {
    builder.addCase(changeInternalPercentagesAction, (state, { payload: { right, left, id } }) => {
      if (id in state.internalPercentagesById) {
        state.internalPercentagesById[id].internalLeftPercentage = left;
        state.internalPercentagesById[id].internalRightPercentage = right;
      } else {
        state.internalPercentagesById[id] = {
          internalLeftPercentage: left,
          internalRightPercentage: right,
        };
      }
    });

    builder.addCase(resetInternalPercentagesAction, (state, { payload: { id } }) => {
      if (id in state.internalPercentagesById) {
        state.internalPercentagesById[id].internalLeftPercentage = undefined;
        state.internalPercentagesById[id].internalRightPercentage = undefined;
      } else {
        state.internalPercentagesById[id] = {
          internalLeftPercentage: undefined,
          internalRightPercentage: undefined,
        };
      }
    });
  }
);
