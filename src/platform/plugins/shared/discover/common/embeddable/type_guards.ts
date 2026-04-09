/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isOfAggregateQueryType } from '@kbn/es-query';
import type {
  DiscoverSessionEmbeddableByReferenceState,
  DiscoverSessionEmbeddableState,
  DiscoverSessionEsqlTab,
  DiscoverSessionTab,
} from '../../server';
import type {
  SearchEmbeddableByValueState,
  SearchEmbeddablePanelApiState,
  SearchEmbeddableState,
  StoredSearchEmbeddableByValueState,
  StoredSearchEmbeddableState,
} from './types';

export function isDiscoverSessionEmbeddableByReferenceState(
  state: DiscoverSessionEmbeddableState
): state is DiscoverSessionEmbeddableByReferenceState {
  return 'ref_id' in state;
}

export function isDiscoverSessionEsqlTab(tab: DiscoverSessionTab): tab is DiscoverSessionEsqlTab {
  return isOfAggregateQueryType(tab.query);
}

export function isSearchEmbeddableByValueState(
  state: SearchEmbeddableState | StoredSearchEmbeddableState
): state is SearchEmbeddableByValueState | StoredSearchEmbeddableByValueState {
  return 'attributes' in state && typeof state.attributes === 'object' && state.attributes !== null;
}

export function isSearchEmbeddableLegacyPanelState(
  state: SearchEmbeddablePanelApiState
): state is SearchEmbeddableState {
  return 'savedObjectId' in state || isSearchEmbeddableByValueState(state);
}
