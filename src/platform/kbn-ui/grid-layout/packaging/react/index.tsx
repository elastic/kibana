/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Build-time type validation — causes build failure if types diverge.
import './type_validation';

import React from 'react';
import { GridLayout as GridLayoutInternal } from '../../grid/grid_layout';

// React import is needed for JSX transform.
void React;

export type {
  GridLayoutData,
  GridSettings,
  GridAccessMode,
  GridLayoutProps,
} from './types';

export type { GridPanelData } from './types';
export type { GridSectionData } from './types';
export { isLayoutEqual } from '../../grid/utils/equality_checks';

/**
 * `GridLayout` — standalone grid layout component for non-Kibana applications.
 *
 * Wraps the internal `GridLayout` component. Kibana-specific dependencies
 * (`@kbn/i18n`, `@kbn/core-chrome-layout-utils`, `@kbn/ui-theme`) are replaced
 * at build time via webpack aliases.
 */
export const GridLayout = GridLayoutInternal;
