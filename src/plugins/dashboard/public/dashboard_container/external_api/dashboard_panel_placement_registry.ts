/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PanelPlacementSettings } from '../component/panel_placement/types';

type GetPanelPlacementSettings<SerializedState extends object = object> = (
  serializedState?: SerializedState
) => PanelPlacementSettings;

const registry = new Map<string, GetPanelPlacementSettings<object>>();

export const registerDashboardPanelPlacementSetting = (
  panelType: string,
  getPanelPlacementSettings: GetPanelPlacementSettings
) => {
  if (registry.has(panelType)) {
    throw new Error(`Embeddable placement for embeddable type ${panelType} already exists`);
  }
  registry.set(panelType, getPanelPlacementSettings);
};

export const getDashboardPanelPlacementSetting = (panelType: string) => {
  return registry.get(panelType);
};
