/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AS_CODE_ESQL_DATA_SOURCE_TYPE } from '@kbn/as-code-data-views-schema';
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
  return 'data_source' in tab && tab.data_source.type === AS_CODE_ESQL_DATA_SOURCE_TYPE;
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
