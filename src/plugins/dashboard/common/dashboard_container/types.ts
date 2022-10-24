/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  ViewMode,
  PanelState,
  EmbeddableInput,
  SavedObjectEmbeddableInput,
} from '@kbn/embeddable-plugin/common';
import { Filter, Query, TimeRange } from '@kbn/es-query';
import { RefreshInterval } from '@kbn/data-plugin/common';
import { PersistableControlGroupInput } from '@kbn/controls-plugin/common';
import { KibanaExecutionContext } from '@kbn/core-execution-context-common';

import { DashboardOptions, GridData } from '../types';

export interface DashboardPanelMap {
  [key: string]: DashboardPanelState;
}

export interface DashboardPanelState<
  TEmbeddableInput extends EmbeddableInput | SavedObjectEmbeddableInput = SavedObjectEmbeddableInput
> extends PanelState<TEmbeddableInput> {
  readonly gridData: GridData;
  panelRefName?: string;
}

export type DashboardContainerInput =
  | DashboardContainerByReferenceInput
  | DashboardContainerByValueInput;

export type DashboardContainerByReferenceInput = SavedObjectEmbeddableInput & { panels: never };

export interface DashboardContainerByValueInput extends EmbeddableInput {
  // filter context
  query: Query;
  filters: Filter[];
  savedQuery?: string;
  timeRestore: boolean;
  timeRange?: TimeRange;
  timeslice?: [number, number];
  refreshInterval?: RefreshInterval;

  // dashboard meta info
  title: string;
  tags: string[];
  viewMode: ViewMode;
  lastSavedId?: string;
  description?: string;
  options: DashboardOptions;
  isEmbeddedExternally?: boolean;
  executionContext?: KibanaExecutionContext;

  // dashboard contents
  controlGroupInput?: PersistableControlGroupInput;
  panels: DashboardPanelMap;
}

// remove these?
// expandedPanelId?: string;
// isFullScreenMode: boolean;
