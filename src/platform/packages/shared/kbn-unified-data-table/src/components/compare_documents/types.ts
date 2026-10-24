/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiDataGridCustomToolbarProps } from '@elastic/eui';
import type React from 'react';

export type DocumentDiffMode = 'basic' | 'chars' | 'words' | 'lines';

export interface UnifiedDataTableRenderCustomComparisonToolbarProps {
  /**
   * The comparison grid's toolbar with its controls, ready to be rendered.
   */
  toolbar: React.ReactElement;
  toolbarProps: EuiDataGridCustomToolbarProps;
}

/**
 * Decorates the toolbar of the comparison grid, e.g. to relocate it; render `toolbar` to keep its controls.
 */
export type UnifiedDataTableRenderCustomComparisonToolbar = (
  props: UnifiedDataTableRenderCustomComparisonToolbarProps
) => React.ReactElement;
