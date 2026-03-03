/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { flow } from 'lodash';
import type { DrilldownTransforms } from '@kbn/embeddable-plugin/common';
import type { SavedObjectReference } from '@kbn/core/server';
import { transformTimeRangeOut, transformTitlesOut } from '@kbn/presentation-publishing';
import { savedSearchToDiscoverSessionEmbeddableState } from './transform_utils';
import type { StoredSearchEmbeddableState } from './types';

export function getTransformOut(transformDrilldownsOut: DrilldownTransforms['transformOut']) {
  function transformOut(
    storedState: StoredSearchEmbeddableState,
    references?: SavedObjectReference[]
  ) {
    const transformsFlow = flow(
      transformTitlesOut<StoredSearchEmbeddableState>,
      transformTimeRangeOut<StoredSearchEmbeddableState>,
      (state: StoredSearchEmbeddableState) => transformDrilldownsOut(state, references)
    );
    const state = transformsFlow(storedState);
    return savedSearchToDiscoverSessionEmbeddableState(state, references);
  }
  return transformOut;
}
