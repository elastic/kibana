/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WithRequiredProperty } from '@kbn/utility-types';
import type { SavedObjectReference } from '@kbn/core-saved-objects-server';
import type { EmbeddableStateWithType } from '@kbn/embeddable-plugin/common';
import type { SavedSearchByValueAttributes } from '@kbn/saved-search-plugin/common';

type EmbeddableStateWithTypeAndAttributes = EmbeddableStateWithType & {
  attributes?: SavedSearchByValueAttributes;
};

export const inject = (
  state: EmbeddableStateWithType,
  injectedReferences: SavedObjectReference[]
): EmbeddableStateWithTypeAndAttributes => {
  if (hasAttributes(state)) {
    // Filter out references that are not in the state
    // https://github.com/elastic/kibana/pull/119079
    const references = state.attributes.references
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
    } as EmbeddableStateWithTypeAndAttributes;
  }

  return state;
};

export const extract = (
  state: EmbeddableStateWithTypeAndAttributes
): {
  state: EmbeddableStateWithTypeAndAttributes;
  references: SavedObjectReference[];
} => {
  let references: SavedObjectReference[] = [];

  if (hasAttributes(state)) {
    references = state.attributes.references;
  }

  return { state, references };
};

const hasAttributes = (
  state: EmbeddableStateWithType
): state is WithRequiredProperty<EmbeddableStateWithTypeAndAttributes, 'attributes'> =>
  'attributes' in state;
