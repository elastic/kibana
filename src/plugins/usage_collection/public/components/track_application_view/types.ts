/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ReactNode } from 'react';

/**
 * Props to provide to the {@Link TrackApplicationView} component.
 * @public
 */
export interface TrackApplicationViewProps {
  /**
   * The name of the view to be tracked. The appId will be obtained automatically.
   * @public
   */
  viewId: string;
  /**
   * The React component to be tracked.
   * @public
   */
  children: ReactNode;
}
