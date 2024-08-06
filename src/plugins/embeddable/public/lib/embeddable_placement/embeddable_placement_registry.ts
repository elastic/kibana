/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

type GetPanelPlacementSettings<StateType> = (serializedState: StateType) => {
  width?: number;
  height?: number;
  strategy?: string;
};

const registry: Map<string, GetPanelPlacementSettings<any>> = new Map();

export const registerEmbeddablePlacementStrategy = <StateType>(
  panelType: string,
  getPanelPlacementSettings: GetPanelPlacementSettings<StateType>
) => {
  if (registry.has(panelType)) {
    throw new Error(`Embeddable placement for embeddable type ${panelType} already exists`);
  }

  registry.set(panelType, getPanelPlacementSettings);
};

export const getEmbeddablePlacementStrategy = (panelType: string) => {
  return registry.get(panelType);
};
