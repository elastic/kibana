/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectReference } from '@kbn/core/server';
import type { DrilldownTransforms } from '@kbn/embeddable-plugin/common';
import { flow } from 'lodash';
import { transformTimeRangeOut, transformTitlesOut } from '@kbn/presentation-publishing';
import type { SearchEmbeddablePanelApiState, StoredSearchEmbeddableState } from './types';
import { fromStoredSearchEmbeddable } from './transform_utils';

export function getTransformOut(transformDrilldownsOut: DrilldownTransforms['transformOut']) {
  return function transformOut(
    storedState: StoredSearchEmbeddableState,
    references?: SavedObjectReference[]
  ): SearchEmbeddablePanelApiState {
    const transformsFlow = flow(
      transformTitlesOut<StoredSearchEmbeddableState>,
      transformTimeRangeOut<StoredSearchEmbeddableState>,
      (state: StoredSearchEmbeddableState) => transformDrilldownsOut(state, references)
    );
    return fromStoredSearchEmbeddable(transformsFlow(storedState), references);
  };
}
