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
import { discoverSessionToSavedSearchEmbeddableState } from './transform_utils';
import type { DiscoverSessionEmbeddableState } from '../../server';
import type { StoredSearchEmbeddableState } from './types';

export { SAVED_SEARCH_SAVED_OBJECT_REF_NAME } from './constants';

export function getTransformIn(transformDrilldownsIn: DrilldownTransforms['transformIn']) {
  return function transformIn(state: DiscoverSessionEmbeddableState): {
    state: StoredSearchEmbeddableState;
    references: SavedObjectReference[];
  } {
    const { state: storedState, references: drilldownReferences } =
      transformDrilldownsIn<DiscoverSessionEmbeddableState>(state);

    return discoverSessionToSavedSearchEmbeddableState(storedState, drilldownReferences);
  };
}
