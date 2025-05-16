/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TimeRange } from '@kbn/es-query';
import {
  CanAddNewPanel,
  HasLastSavedChildState,
  HasSerializedChildState,
  PresentationContainer,
} from '@kbn/presentation-containers';
import {
  HasExecutionContext,
  PublishesDataLoading,
  PublishesTimeRange,
  PublishesUnsavedChanges,
  SerializedPanelState,
  PublishesViewMode,
} from '@kbn/presentation-publishing';
import { PublishesReload } from '@kbn/presentation-publishing/interfaces/fetch/publishes_reload';

export type PageApi = PresentationContainer &
  CanAddNewPanel &
  HasExecutionContext &
  HasLastSavedChildState &
  HasSerializedChildState &
  PublishesDataLoading &
  PublishesViewMode &
  PublishesReload &
  PublishesTimeRange &
  PublishesUnsavedChanges;

export interface PageState {
  timeRange: TimeRange;
  panels: Array<{ id: string; type: string; serializedState: SerializedPanelState | undefined }>;
}
