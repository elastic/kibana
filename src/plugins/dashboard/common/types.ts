/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EmbeddableInput,
  EmbeddableStateWithType,
  PanelState,
} from '@kbn/embeddable-plugin/common/types';
import { SavedObjectEmbeddableInput } from '@kbn/embeddable-plugin/common/lib/saved_object_embeddable';
import { ControlGroupInput, PersistableControlGroupInput } from '@kbn/controls-plugin/common';
import {
  RawSavedDashboardPanelTo60,
  RawSavedDashboardPanel610,
  RawSavedDashboardPanel620,
  RawSavedDashboardPanel630,
  RawSavedDashboardPanel640To720,
  RawSavedDashboardPanel730ToLatest,
} from './bwc/types';

import { GridData } from './embeddable/types';

export type PanelId = string;
export type SavedObjectId = string;

export interface DashboardPanelState<
  TEmbeddableInput extends EmbeddableInput | SavedObjectEmbeddableInput = SavedObjectEmbeddableInput
> extends PanelState<TEmbeddableInput> {
  readonly gridData: GridData;
  panelRefName?: string;
}

export interface DashboardCapabilities {
  showWriteControls: boolean;
  saveQuery: boolean;
  createNew: boolean;
  show: boolean;
  [key: string]: boolean;
}

/**
 * This should always represent the latest dashboard panel shape, after all possible migrations.
 */
export type SavedDashboardPanel = SavedDashboardPanel730ToLatest;

export type SavedDashboardPanel640To720 = Pick<
  RawSavedDashboardPanel640To720,
  Exclude<keyof RawSavedDashboardPanel640To720, 'name'>
> & {
  readonly id: string;
  readonly type: string;
};

export type SavedDashboardPanel630 = Pick<
  RawSavedDashboardPanel630,
  Exclude<keyof RawSavedDashboardPanel620, 'name'>
> & {
  readonly id: string;
  readonly type: string;
};

export type SavedDashboardPanel620 = Pick<
  RawSavedDashboardPanel620,
  Exclude<keyof RawSavedDashboardPanel620, 'name'>
> & {
  readonly id: string;
  readonly type: string;
};

export type SavedDashboardPanel610 = Pick<
  RawSavedDashboardPanel610,
  Exclude<keyof RawSavedDashboardPanel610, 'name'>
> & {
  readonly id: string;
  readonly type: string;
};

export type SavedDashboardPanelTo60 = Pick<
  RawSavedDashboardPanelTo60,
  Exclude<keyof RawSavedDashboardPanelTo60, 'name'>
> & {
  readonly id: string;
  readonly type: string;
};

// id becomes optional starting in 7.3.0
export type SavedDashboardPanel730ToLatest = Pick<
  RawSavedDashboardPanel730ToLatest,
  Exclude<keyof RawSavedDashboardPanel730ToLatest, 'name'>
> & {
  readonly id?: string;
  readonly type: string;
};

// Making this interface because so much of the Container type from embeddable is tied up in public
// Once that is all available from common, we should be able to move the dashboard_container type to our common as well

export interface DashboardContainerStateWithType extends EmbeddableStateWithType {
  panels: {
    [panelId: string]: DashboardPanelState<EmbeddableInput & { [k: string]: unknown }>;
  };
  controlGroupInput?: PersistableControlGroupInput;
}
