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
} from '@kbn/presentation-containers';
import { PublishesTimeRange } from '@kbn/presentation-publishing';

export type ParentApi = PresentationContainer &
  CanAddNewPanel &
  HasSerializedChildState &
  HasRuntimeChildState &
  PublishesTimeRange;

export interface LastSavedPanelState {
  id: string;
}
export interface LastSavedState {
  timeRange: TimeRange;
  panels: Array<SerializedPanelState<LastSavedPanelState>>;
}

export interface UnsavedPanelState {
  id: string;
}
export interface UnsavedChanges {
  timeRange?: TimeRange;
  panels?: UnsavedPanelState[];
}
