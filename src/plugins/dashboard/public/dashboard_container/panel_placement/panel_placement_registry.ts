/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { GetPanelPlacementSettings } from './types';
import { panelPlacementStrings } from '../_dashboard_container_strings';

const registry = new Map<string, GetPanelPlacementSettings>();

export const registerDashboardPanelPlacementSetting = <
  SerializedState extends object = object,
  RuntimeState extends object = object
>(
  embeddableType: string,
  getPanelPlacementSettings: GetPanelPlacementSettings<SerializedState, RuntimeState>
) => {
  if (registry.has(embeddableType)) {
    throw new Error(panelPlacementStrings.getPanelPlacementSettingsExistsError(embeddableType));
  }
  registry.set(embeddableType, getPanelPlacementSettings as GetPanelPlacementSettings<object>);
};

export const getDashboardPanelPlacementSetting = (embeddableType: string) => {
  return registry.get(embeddableType);
};
