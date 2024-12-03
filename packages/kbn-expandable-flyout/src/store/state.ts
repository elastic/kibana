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
  /*
   * History of the right panel that were opened
   */
  history: FlyoutPanelProps[];
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

export interface DefaultWidthsState {
  /**
   * Default width for the right section (calculated from the window width)
   */
  rightWidth: number;
  /**
   * Default width for the left section (calculated from the window width)
   */
  leftWidth: number;
  /**
   * Default width for the preview section (calculated from the window width)
   */
  previewWidth: number;
  /**
   * Value of the right width in percentage (of the flyout total width)
   */
  rightPercentage: number;
  /**
   * Value of the left width in percentage (of the flyout total width)
   */
  leftPercentage: number;
  /**
   * Value of the preview width in percentage (of the flyout total width)
   */
  previewPercentage: number;
}

export interface UserFlyoutWidthsState {
  /**
   * Width of the collapsed flyout
   */
  collapsedWidth?: number;
  /**
   * Width of the expanded flyout
   */
  expandedWidth?: number;
}

export interface UserSectionWidthsState {
  /**
   * Percentage for the left section
   */
  leftPercentage: number | undefined;
  /**
   * Percentage for the right section
   */
  rightPercentage: number | undefined;
}

export interface UiState {
  /**
   * Push vs overlay information
   */
  pushVsOverlay: 'push' | 'overlay';
  /**
   * Default widths for the flyout
   */
  defaultWidths: DefaultWidthsState;
  /**
   * User resized widths for the flyout
   */
  userFlyoutWidths: UserFlyoutWidthsState;
  /**
   * User resized left and right section widths for the flyout
   */
  userSectionWidths: UserSectionWidthsState;
}

export const initialUiState: UiState = {
  pushVsOverlay: 'overlay',
  defaultWidths: {} as DefaultWidthsState,
  userFlyoutWidths: {},
  userSectionWidths: {} as UserSectionWidthsState,
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
