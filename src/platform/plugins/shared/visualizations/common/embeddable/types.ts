/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DynamicActionsSerializedState } from '@kbn/embeddable-enhanced-plugin/public';
import type { SerializedTimeRange, SerializedTitles } from '@kbn/presentation-publishing';
import type { SerializedVis, VisParams } from '../types';

/*
serializedVis: vis$.getValue().serialize(),
        titles: titleManager.getLatestState(),
        id: savedObjectId,
        linkedToLibrary: linkedToLibraryArg,
        ...(runtimeState.savedObjectProperties
          ? { savedObjectProperties: runtimeState.savedObjectProperties }
          : {}),
        serializeDynamicActions: dynamicActionsManager?.serializeState,
        ...timeRangeManager.getLatestState(),*/

export interface VisualizeByReferenceState {
  savedObjectId?: string;
  uiState?: any;
}

export interface VisualizeByValueState {
  savedVis: SerializedVis<VisParams>;
}

export type StoredVisualizeEmbeddableState = SerializedTitles &
  SerializedTimeRange &
  Partial<DynamicActionsSerializedState> &
  (VisualizeByReferenceState | VisualizeByValueState);
