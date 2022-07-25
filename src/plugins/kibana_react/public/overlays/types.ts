/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import { CoreStart } from '@kbn/core/public';

export interface KibanaReactOverlays {
  openFlyout: (
    node: React.ReactNode,
    options?: Parameters<CoreStart['overlays']['openFlyout']>['1']
  ) => ReturnType<CoreStart['overlays']['openFlyout']>;
  openModal: (
    node: React.ReactNode,
    options?: Parameters<CoreStart['overlays']['openModal']>['1']
  ) => ReturnType<CoreStart['overlays']['openModal']>;
}
