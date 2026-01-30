/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import type { SerializedVis, SerializedVisData } from '../../types';
import type { VisualizeByReferenceState, VisualizeEmbeddableBaseState } from '../types';

export type StoredVisualizeByReferenceState = VisualizeEmbeddableBaseState &
  Omit<VisualizeByReferenceState, 'savedObjectId'>;

export type StoredVis = Omit<SerializedVis, 'data'> & {
  data: Omit<SerializedVisData, 'searchSource'> & {
    savedSearchRefName?: string;
    searchSource: SerializedSearchSourceFields & { indexRefName?: string };
  };
};

export type StoredVisualizeByValueState = VisualizeEmbeddableBaseState & {
  savedVis: StoredVis;
};

export type StoredVisualizeEmbeddableState =
  | StoredVisualizeByReferenceState
  | StoredVisualizeByValueState;
