/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import type { LayoutService, LayoutServiceStartDeps } from '../../layout_service';
/**
 * Service for providing layout component wired to other core services.
 */
export declare class GridLayout implements LayoutService {
  private readonly deps;
  constructor(deps: LayoutServiceStartDeps);
  /**
   * Returns a layout component with the provided dependencies
   */
  getComponent(): React.ComponentType;
}
