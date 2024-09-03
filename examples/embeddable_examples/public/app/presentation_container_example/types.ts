/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

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
  PublishesPanelTitle,
  PublishesTimeRange,
  PublishesViewMode,
} from '@kbn/presentation-publishing';

export type ParentApi = PresentationContainer &
  CanAddNewPanel &
  HasSaveNotification &
  HasSerializedChildState &
  HasRuntimeChildState &
  PublishesViewMode &
  Pick<PublishesPanelTitle, 'hidePanelTitle'> &
  PublishesTimeRange;

export interface LastSavedState {
  timeRange: TimeRange;
  panelsState: Array<{ id: string; type: string; panelState: SerializedPanelState }>;
}

export interface UnsavedChanges {
  timeRange?: TimeRange;
  panels?: Array<{ id: string; type: string }>;
  panelUnsavedChanges?: Record<string, object>;
}
