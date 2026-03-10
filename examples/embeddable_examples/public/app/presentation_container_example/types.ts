/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TimeRange } from '@kbn/es-query';
import type {
  CanAddNewPanel,
  HasLastSavedChildState,
  HasSerializedChildState,
  PresentationContainer,
  HasExecutionContext,
  PublishesDataLoading,
  PublishesTimeRange,
  PublishesUnsavedChanges,
  PublishesViewMode,
} from '@kbn/presentation-publishing';
import type { PublishesReload } from '@kbn/presentation-publishing/interfaces/fetch/publishes_reload';

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
  panels: Array<{ id: string; type: string; serializedState: object | undefined }>;
}
