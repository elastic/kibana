/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createContext } from 'react';
import type { ViewMode } from '@kbn/presentation-publishing';

export const EmbeddableRendererContext = createContext<
  {
    quickActions?: QuickActions 
  } | undefined
>(undefined);

export type QuickActionIds = [
  string?,
  string?,
  string?,
  string?,
  string?,
  string?,
  string?,
  string?
];

type QuickActionViewMode = Extract<ViewMode, 'view' | 'edit'>;

/**
 * Limited sets of action ids that will be promoted to quick actions on the panel header that appear on hover.
 * Actions in this list only appear if they are deemed compatible. Use EmbeddableRendererContext to customize.
 */
export type QuickActions = {
  [key in QuickActionViewMode]?: QuickActionIds;
};
