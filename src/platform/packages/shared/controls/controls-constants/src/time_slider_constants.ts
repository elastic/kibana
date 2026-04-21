/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TIME_SLIDER_CONTROL } from './control_constants';

export function pinnedPanelsContainTimeSlider(
  pinnedPanels: Record<string, { type: string }>
): boolean {
  return Object.values(pinnedPanels).some((panel) => panel.type === TIME_SLIDER_CONTROL);
}

export const DEFAULT_TIME_SLIDER_STATE = {
  start_percentage_of_time_range: 0,
  end_percentage_of_time_range: 1,
  is_anchored: false,
} as const;
