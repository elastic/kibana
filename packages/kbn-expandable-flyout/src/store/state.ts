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

export interface FlyoutPanelsState {
  /**
   * Store the panels for multiple flyouts
   */
  panelsById: {
    [id: string]: FlyoutPanels;
  };
  /**
   * Is the flyout in sync with external storage (eg. url)?
   * This value can be used in useEffect for example, to control whether we should
   * call an external state sync method.
   */
  needsSync?: boolean;
}

export const panelsState: FlyoutPanelsState = {
  panelsById: {},
  needsSync: false,
};

export interface PushVsOverlayState {
  /**
   *
   */
  pushVsOverlayById: {
    [id: string]: 'push' | 'overlay';
  };
}

export const pushVsOverlayInitialState: PushVsOverlayState = {
  pushVsOverlayById: {},
};

export interface DefaultWidthsState {
  /**
   *
   */
  defaultWidths: {
    /**
     *
     */
    rightWidth: number;
    /**
     *
     */
    leftWidth: number;
    /**
     *
     */
    previewWidth: number;
    /**
     *
     */
    rightPercentage: number;
    /**
     *
     */
    leftPercentage: number;
    /**
     *
     */
    previewPercentage: number;
  };
}

export const defaultWidthsInitialState: DefaultWidthsState = {
  defaultWidths: {},
};

export interface WidthsState {
  /**
   *
   */
  widthsById: {
    [id: string]: {
      /**
       *
       */
      collapsedWidth?: number;
      /**
       *
       */
      expandedWidth?: number;
    };
  };
}

export const widthsInitialState: WidthsState = {
  widthsById: {},
};

export interface InternalPercentagesState {
  /**
   *
   */
  internalPercentagesById: {
    [id: string]: {
      /**
       *
       */
      internalLeftPercentage: number | undefined;
      /**
       *
       */
      internalRightPercentage: number | undefined;
    };
  };
}

export const internalPercentagesInitialState: InternalPercentagesState = {
  internalPercentagesById: {},
};

export interface State {
  /**
   * Store the panels for multiple flyouts
   */
  panels: FlyoutPanelsState;
  /**
   *
   */
  pushVsOverlay: PushVsOverlayState;
  /**
   *
   */
  defaultWidths: DefaultWidthsState;
  /**
   *
   */
  widths: WidthsState;
  /**
   *
   */
  internalPercentages: InternalPercentagesState;
}

export const initialState: State = {
  panels: panelsState,
  pushVsOverlay: pushVsOverlayInitialState,
  defaultWidths: defaultWidthsInitialState,
  widths: widthsInitialState,
  internalPercentages: internalPercentagesInitialState,
};
