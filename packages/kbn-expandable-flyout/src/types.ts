/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

export interface FlyoutPanelProps {
  /**
   * Unique key to identify the panel
   */
  id: string;
  /**
   * Any parameters necessary for the initial requests within the flyout
   */
  params?: Record<string, unknown>;
  /**
   * Tracks the path for what to show in a panel. We may have multiple tabs or details..., so easiest to just use a stack
   */
  path?: string[];
  /**
   * Tracks visual state such as whether the panel is collapsed
   */
  state?: Record<string, unknown>;
}

export interface Panel {
  /**
   * Unique key used to identify the panel
   */
  key?: string;
  /**
   * Component to be rendered
   */
  component: (props: FlyoutPanelProps) => React.ReactElement;
}
