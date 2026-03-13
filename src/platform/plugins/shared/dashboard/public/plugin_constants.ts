/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PanelPlacementStrategy, type PanelSettings } from '@kbn/presentation-util-plugin/public';
import { DEFAULT_PANEL_HEIGHT, DEFAULT_PANEL_WIDTH } from '../common/constants';

export const DEFAULT_PANEL_PLACEMENT_SETTINGS: Required<
  Required<PanelSettings>['placementSettings']
> = {
  strategy: PanelPlacementStrategy.findTopLeftMostOpenSpace,
  height: DEFAULT_PANEL_HEIGHT,
  width: DEFAULT_PANEL_WIDTH,
} as const;
