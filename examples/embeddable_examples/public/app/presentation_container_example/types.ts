/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import { TimeRange } from '@kbn/es-query';
import {
  CanAddNewPanel,
  HasSerializedChildState,
  HasRuntimeChildState,
  PresentationContainer,
  SerializedPanelState,
  HasSaveNotification,
} from '@kbn/presentation-containers';
import {
  HasExecutionContext,
  PublishesDataLoading,
  PublishesTimeRange,
  PublishesUnsavedChanges,
  PublishesViewMode,
} from '@kbn/presentation-publishing';
import { PublishesReload } from '@kbn/presentation-publishing/interfaces/fetch/publishes_reload';

export type ParentApi = PresentationContainer &
  CanAddNewPanel &
  HasExecutionContext &
  HasSaveNotification &
  HasSerializedChildState &
  HasRuntimeChildState &
  PublishesDataLoading &
  PublishesViewMode &
  PublishesReload &
  PublishesTimeRange &
  PublishesUnsavedChanges & {
    getAllDataViews: () => DataView[];
  };

export interface LastSavedState {
  timeRange: TimeRange;
  panelsState: Array<{ id: string; type: string; panelState: SerializedPanelState }>;
}

export interface UnsavedChanges {
  timeRange?: TimeRange;
  panels?: Array<{ id: string; type: string }>;
  panelUnsavedChanges?: Record<string, object>;
}
