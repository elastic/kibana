/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FlyoutPanelProps } from '../types';

export interface FlyoutPanelsState {
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

export interface State {
  /**
   * Store the panels for multiple flyouts
   */
  panelsById: {
    [id: string]: FlyoutPanelsState;
  };
  /**
   * Is the flyout in sync with external storage (eg. url)?
   * This value can be used in useEffect for example, to control whether we should
   * call an external state sync method.
   */
  needsSync?: boolean;
}

export const initialState: State = {
  panelsById: {},
  needsSync: false,
};
