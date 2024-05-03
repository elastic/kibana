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
  changeCollapsedWidthAction,
  changeExpandedWidthAction,
  resetCollapsedWidthAction,
  resetExpandedWidthAction,
  changeInternalPercentagesAction,
  resetInternalPercentagesAction,
  setDefaultWidthsAction,
} from './actions';
import { initialState } from './state';

const expandableFlyoutLocalStorageKey = 'expandableFlyout';
const collapsedLocalStorage = 'collapsedResizedWidth';
const expandedLocalStorage = 'expandedResizedWidth';
const internalPercentagesLocalStorage = 'internalPercentage';

export const reducer = createReducer(initialState, (builder) => {
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

  builder.addCase(changeCollapsedWidthAction, (state, { payload: { width, id } }) => {
    localStorage.setItem(
      `${expandableFlyoutLocalStorageKey}.${collapsedLocalStorage}.${id}`,
      width.toString()
    );

    if (id in state.widthsById) {
      state.widthsById[id].collapsedWidth = width;
    } else {
      state.widthsById[id] = {
        collapsedWidth: width,
      };
    }
  });

  builder.addCase(resetCollapsedWidthAction, (state, { payload: { id } }) => {
    localStorage.removeItem(`${expandableFlyoutLocalStorageKey}.${collapsedLocalStorage}.${id}`);

    if (id in state.widthsById) {
      state.widthsById[id].collapsedWidth = undefined;
    } else {
      state.widthsById[id] = {
        collapsedWidth: undefined,
      };
    }
  });

  builder.addCase(changeExpandedWidthAction, (state, { payload: { width, id } }) => {
    localStorage.setItem(
      `${expandableFlyoutLocalStorageKey}.${expandedLocalStorage}.${id}`,
      width.toString()
    );

    if (id in state.widthsById) {
      state.widthsById[id].expandedWidth = width;
    } else {
      state.widthsById[id] = {
        expandedWidth: width,
      };
    }
  });

  builder.addCase(resetExpandedWidthAction, (state, { payload: { id } }) => {
    localStorage.removeItem(`${expandableFlyoutLocalStorageKey}.${expandedLocalStorage}.${id}`);

    if (id in state.widthsById) {
      state.widthsById[id].expandedWidth = undefined;
    } else {
      state.widthsById[id] = {
        expandedWidth: undefined,
      };
    }
  });

  builder.addCase(setDefaultWidthsAction, (state, { payload: { right, left, preview } }) => {
    state.defaultWidths.rightWidth = right;
    state.defaultWidths.leftWidth = left;
    state.defaultWidths.previewWidth = preview;
    state.defaultWidths.rightPercentage = (right / (right + left)) * 100;
    state.defaultWidths.leftPercentage = (left / (right + left)) * 100;
    state.defaultWidths.previewPercentage = (right / (right + left)) * 100;
  });

  builder.addCase(changeInternalPercentagesAction, (state, { payload: { right, left, id } }) => {
    localStorage.setItem(
      `${expandableFlyoutLocalStorageKey}.${internalPercentagesLocalStorage}.${id}`,
      JSON.stringify({ left, right })
    );

    if (id in state.widthsById) {
      state.widthsById[id].internalLeftPercentage = left;
      state.widthsById[id].internalRightPercentage = right;
    } else {
      state.widthsById[id] = {
        internalLeftPercentage: left,
        internalRightPercentage: right,
      };
    }
  });

  builder.addCase(resetInternalPercentagesAction, (state, { payload: { id } }) => {
    localStorage.removeItem(
      `${expandableFlyoutLocalStorageKey}.${internalPercentagesLocalStorage}.${id}`
    );

    if (id in state.widthsById) {
      state.widthsById[id].internalLeftPercentage = undefined;
      state.widthsById[id].internalRightPercentage = undefined;
    } else {
      state.widthsById[id] = {
        internalLeftPercentage: undefined,
        internalRightPercentage: undefined,
      };
    }
  });
});
