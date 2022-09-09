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
import { Serializable } from '@kbn/utility-types';
import {
  PersistableControlGroupInput,
  RawControlGroupAttributes,
} from '@kbn/controls-plugin/common';
import { RefreshInterval } from '@kbn/data-plugin/common';
import { SavedObjectEmbeddableInput } from '@kbn/embeddable-plugin/common/lib/saved_object_embeddable';

export interface DashboardCapabilities {
  showWriteControls: boolean;
  saveQuery: boolean;
  createNew: boolean;
  show: boolean;
  [key: string]: boolean;
}

/**
 * The attributes of the dashboard saved object. This interface should be the
 * source of truth for the latest dashboard attributes shape after all migrations.
 */
export interface DashboardAttributes {
  controlGroupInput?: RawControlGroupAttributes;
  refreshInterval?: RefreshInterval;
  timeRestore: boolean;
  optionsJSON?: string;
  useMargins?: boolean;
  description: string;
  panelsJSON: string;
  timeFrom?: string;
  version: number;
  timeTo?: string;
  title: string;
  kibanaSavedObjectMeta: {
    searchSourceJSON: string;
  };
}

/** --------------------------------------------------------------------
 * Dashboard panel types
 -----------------------------------------------------------------------*/

/**
 * The dashboard panel format expected by the embeddable container.
 */
export interface DashboardPanelState<
  TEmbeddableInput extends EmbeddableInput | SavedObjectEmbeddableInput = SavedObjectEmbeddableInput
> extends PanelState<TEmbeddableInput> {
  readonly gridData: GridData;
  panelRefName?: string;
}

/**
 * A saved dashboard panel parsed directly from the Dashboard Attributes panels JSON
 */
export interface SavedDashboardPanel {
  embeddableConfig: { [key: string]: Serializable }; // parsed into the panel's explicitInput
  id?: string; // the saved object id for by reference panels
  type: string; // the embeddable type
  panelRefName?: string;
  gridData: GridData;
  panelIndex: string;
  version: string;
  title?: string;
}

/**
 * Grid type for React Grid Layout
 */
export interface GridData {
  w: number;
  h: number;
  x: number;
  y: number;
  i: string;
}

export interface DashboardPanelMap {
  [key: string]: DashboardPanelState;
}

/** --------------------------------------------------------------------
 * Dashboard container types
 -----------------------------------------------------------------------*/

/**
 * Types below this line are copied here because so many important types are tied up in public. These types should be
 * moved from public into common.
 */
export interface DashboardContainerStateWithType extends EmbeddableStateWithType {
  panels: {
    [panelId: string]: DashboardPanelState<EmbeddableInput & { [k: string]: unknown }>;
  };
  controlGroupInput?: PersistableControlGroupInput;
}
