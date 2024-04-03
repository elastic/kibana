/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EmbeddableInput } from '@kbn/embeddable-plugin/public';
import { DashboardPanelState } from '../../../../common';
import { GridData } from '../../../../common/content_management';
import { panelPlacementStrategies } from './place_new_panel_strategies';

export type PanelPlacementStrategy = keyof typeof panelPlacementStrategies;

export interface PanelPlacementSettings {
  strategy: PanelPlacementStrategy;
  height: number;
  width: number;
}

export interface PanelPlacementReturn {
  newPanelPlacement: Omit<GridData, 'i'>;
  otherPanels: { [key: string]: DashboardPanelState };
}

export interface PanelPlacementProps {
  width: number;
  height: number;
  currentPanels: { [key: string]: DashboardPanelState };
}

export interface IProvidesPanelPlacementSettings<
  InputType extends EmbeddableInput = EmbeddableInput,
  AttributesType = unknown
> {
  getPanelPlacementSettings: (
    input: InputType,
    attributes?: AttributesType
  ) => Partial<PanelPlacementSettings>;
}
