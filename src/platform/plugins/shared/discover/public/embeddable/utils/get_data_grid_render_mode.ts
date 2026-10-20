/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ViewMode } from '@kbn/presentation-publishing';
import type { DataGridRenderMode } from '@kbn/unified-data-table';

/**
 * Maps the embeddable's view mode to the render mode of its table.
 */
export const getDataGridRenderMode = (viewMode: ViewMode | undefined): DataGridRenderMode =>
  viewMode === 'print' || viewMode === 'non-interactive' ? viewMode : 'interactive';
