/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FlyoutPanel } from './types';
import { Action, ActionType } from './actions';

export interface State {
  /**
   * Panel to render in the left section
   */
  left: FlyoutPanel | undefined;
  /**
   * Panel to render in the right section
   */
  right: FlyoutPanel | undefined;
  /**
   * Panels to render in the preview section
   */
  preview: FlyoutPanel[];
}

export const initialState: State = {
  left: undefined,
  right: undefined,
  preview: [],
};

export function reducer(state: State, action: Action) {
  switch (action.type) {
    /**
     * Open the flyout by replacing the entire state with new panels.
     */
    case ActionType.openFlyout: {
      const { left, right, preview } = action.payload;
      return {
        left,
        right,
        preview: preview ? [preview] : [],
      };
    }

    /**
     * Opens a right section by replacing the previous right panel with the new one.
     */
    case ActionType.openRightPanel: {
      return { ...state, right: action.payload };
    }

    /**
     * Opens a left section by replacing the previous left panel with the new one.
     */
    case ActionType.openLeftPanel: {
      return { ...state, left: action.payload };
    }

    /**
     * Opens a preview section by adding to the array of preview panels.
     */
    case ActionType.openPreviewPanel: {
      return { ...state, preview: [...state.preview, action.payload] };
    }

    /**
     * Closes the right section by removing the right panel.
     */
    case ActionType.closeRightPanel: {
      return { ...state, right: undefined };
    }

    /**
     * Close the left section by  removing the left panel.
     */
    case ActionType.closeLeftPanel: {
      return { ...state, left: undefined };
    }

    /**
     * Closes the preview section by removing all the preview panels.
     */
    case ActionType.closePreviewPanel: {
      return { ...state, preview: [] };
    }

    /**
     * Navigates to the previous preview panel by removing the last entry in the array of preview panels.
     */
    case ActionType.previousPreviewPanel: {
      const p: FlyoutPanel[] = [...state.preview];
      p.pop();
      return { ...state, preview: p };
    }

    /**
     * Close the flyout by removing all the panels.
     */
    case ActionType.closeFlyout: {
      return {
        left: undefined,
        right: undefined,
        preview: [],
      };
    }

    default:
      return state;
  }
}
