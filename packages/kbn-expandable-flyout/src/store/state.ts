/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FlyoutPanelProps } from '../..';

export interface FlyoutPanels {
  /**
   * Panel to render in the left section
   */
  left: FlyoutPanelProps | undefined;
  /**
   * Panel to render in the right section
   */
  right: FlyoutPanelProps | undefined;
  /**
   * Panels to render in the preview section
   */
  preview: FlyoutPanelProps[] | undefined;
}

export interface PanelsState {
  /**
   * Store the panels for multiple flyouts
   */
  byId: {
    [id: string]: FlyoutPanels;
  };
  /**
   * Is the flyout in sync with external storage (eg. url)?
   * This value can be used in useEffect for example, to control whether we should
   * call an external state sync method.
   */
  needsSync?: boolean;
}

export const initialPanelsState: PanelsState = {
  byId: {},
  needsSync: false,
};

export interface UiState {
  /**
   * Push vs overlay information
   */
  pushVsOverlay: 'push' | 'overlay';
}

export const initialUiState: UiState = {
  pushVsOverlay: 'overlay',
};

export interface State {
  /**
   * All panels related information
   */
  panels: PanelsState;
  /**
   * All ui related information
   */
  ui: UiState;
}

export const initialState: State = {
  panels: initialPanelsState,
  ui: initialUiState,
};
