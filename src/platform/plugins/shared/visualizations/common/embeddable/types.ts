/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializedTimeRange, SerializedTitles } from '@kbn/presentation-publishing';
import type { VisParams } from '@kbn/visualizations-common';
import type { DrilldownsState } from '@kbn/embeddable-plugin/server';
import type { SerializedVis } from '../types';

export type VisualizeEmbeddableBaseState = SerializedTitles & SerializedTimeRange & DrilldownsState;

export type VisualizeByReferenceState = VisualizeEmbeddableBaseState & {
  savedObjectId?: string;
  uiState?: any;
};

export type VisualizeByValueState = VisualizeEmbeddableBaseState & {
  savedVis: SerializedVis<VisParams>;
};

export type VisualizeEmbeddableState = VisualizeByReferenceState | VisualizeByValueState;
