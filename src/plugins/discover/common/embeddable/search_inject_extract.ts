/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectReference } from '@kbn/core-saved-objects-server';
import { SerializedPanelState } from '@kbn/presentation-containers';
import { SavedSearchByValueAttributes } from '@kbn/saved-search-plugin/public';
import { SearchEmbeddableSerializedState } from './types';

export const inject = (
  state: SearchEmbeddableSerializedState,
  injectedReferences: SavedObjectReference[]
): SearchEmbeddableSerializedState => {
  if (hasAttributes(state)) {
    // Filter out references that are not in the state
    // https://github.com/elastic/kibana/pull/119079
    const references = (state.attributes?.references ?? [])
      .map((stateRef) =>
        injectedReferences.find((injectedRef) => injectedRef.name === stateRef.name)
      )
      .filter(Boolean);

    state = {
      ...state,
      attributes: {
        ...state.attributes,
        references,
      },
    } as SearchEmbeddableSerializedState;
  }

  return state;
};

export const extract = (state: {
  attributes: SavedSearchByValueAttributes;
}): SerializedPanelState<{
  attributes: SearchEmbeddableSerializedState;
}> => {
  let references: SavedObjectReference[] = [];

  if (hasAttributes(state)) {
    references = state.attributes.references;
  }

  return { rawState: state, references };
};

const hasAttributes = (state: unknown): state is SearchEmbeddableSerializedState =>
  'attributes' in (state as SearchEmbeddableSerializedState);
