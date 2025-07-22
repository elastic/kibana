/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { InternalApplicationStart } from '@kbn/core-application-browser-internal';
import type { InternalChromeStart } from '@kbn/core-chrome-browser-internal';
import type { OverlayStart } from '@kbn/core-overlays-browser';

export interface LayoutServiceStartDeps {
  application: InternalApplicationStart;
  chrome: InternalChromeStart;
  overlays: OverlayStart;
}

export interface LayoutServiceParams {
  debug?: boolean;
}

/**
 * The LayoutService responsible for layout management of Kibana.
 * Kibana can swap between different layout service implementation to support different layout types.
 *
 * @internal
 */
export interface LayoutService {
  /**
   * Returns a layout component with the provided dependencies
   */
  getComponent: () => React.ComponentType;
}
