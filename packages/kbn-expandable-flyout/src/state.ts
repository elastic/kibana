/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FlyoutPanelProps } from './types';

export interface State {
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
  preview: FlyoutPanelProps[];

  /**
   * Is the flyout in sync with external storage (eg. url)?
   * This value can be used in useEffect for example, to control whether we should
   * call an external state sync method.
   */
  needsSync?: boolean;
}

export const initialState: State = {
  left: undefined,
  right: undefined,
  preview: [],
  needsSync: false,
};
