/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LayoutDirection } from '@kbn/workflows';
import type { WorkflowRunGraphLayout } from '../../../../server/dashboard_run_panel/schema';

/** The graph layout direction for a panel setting, following the panel's shape when it is `auto`. */
export const getGraphDirection = (
  layout: WorkflowRunGraphLayout | undefined,
  { width, height }: { width: number; height: number }
): LayoutDirection => {
  if (layout === 'horizontal') return 'LR';
  if (layout === 'vertical') return 'TB';
  return width > height ? 'LR' : 'TB';
};
