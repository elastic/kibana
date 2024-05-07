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
import { KibanaExecutionContext } from '@kbn/core-execution-context-common';

import { DashboardOptions } from '../types';
import { GridData } from '../content_management';

export interface DashboardPanelMap {
  [key: string]: DashboardPanelState;
}

export interface DashboardPanelState<
  TEmbeddableInput extends EmbeddableInput | SavedObjectEmbeddableInput = SavedObjectEmbeddableInput
> extends PanelState<TEmbeddableInput> {
  readonly gridData: GridData;
  panelRefName?: string;

  /**
   * This version key was used to store Kibana version information from versions 7.3.0 -> 8.11.0.
   * As of version 8.11.0, the versioning information is now per-embeddable-type and is stored on the
   * embeddable's input. This key is needed for BWC, but its value will be removed on Dashboard save.
   */
  version?: string;
}

export type DashboardContainerByReferenceInput = SavedObjectEmbeddableInput;

export interface DashboardContainerInput extends EmbeddableInput {
  // filter context to be passed to children
  query: Query;
  filters: Filter[];
  timeRestore: boolean;
  timeRange?: TimeRange;
  timeslice?: [number, number];
  refreshInterval?: RefreshInterval;

  // dashboard meta info
  title: string;
  tags: string[];
  viewMode: ViewMode;
  description?: string;
  isEmbeddedExternally?: boolean;
  executionContext: KibanaExecutionContext;

  // dashboard options: TODO, build a new system to avoid all shared state appearing here. See https://github.com/elastic/kibana/issues/144532 for more information.
  hidePanelTitles: DashboardOptions['hidePanelTitles'];
  syncTooltips: DashboardOptions['syncTooltips'];
  useMargins: DashboardOptions['useMargins'];
  syncColors: DashboardOptions['syncColors'];
  syncCursor: DashboardOptions['syncCursor'];

  // dashboard contents
  panels: DashboardPanelMap;
}
