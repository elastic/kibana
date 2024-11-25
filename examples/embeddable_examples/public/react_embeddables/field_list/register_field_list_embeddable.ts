/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DashboardStart, PanelPlacementStrategy } from '@kbn/dashboard-plugin/public';
import { FIELD_LIST_ID } from './constants';
import { FieldListSerializedStateState } from './types';

const getPanelPlacementSetting = (serializedState?: FieldListSerializedStateState) => {
  // Consider using the serialized state to determine the width, height, and strategy
  return {
    width: 12,
    height: 36,
    strategy: PanelPlacementStrategy.placeAtTop,
  };
};

export function registerFieldListPanelPlacementSetting(dashboard: DashboardStart) {
  dashboard.registerDashboardPanelPlacementSetting(FIELD_LIST_ID, getPanelPlacementSetting);
}
