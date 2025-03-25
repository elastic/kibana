/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EmbeddableRegistryDefinition,
  EmbeddableStateWithType,
} from '@kbn/embeddable-plugin/common';
import type { LinksAttributes, LinksSerializedState } from '../content_management';
import { extractReferences } from '../../common/persistable_state';

export const extract: NonNullable<EmbeddableRegistryDefinition['extract']> = (state) => {
  const typedState = state as EmbeddableStateWithType & LinksSerializedState;

  // by-reference embeddable
  if (!('attributes' in typedState) || typedState.attributes === undefined) {
    // No references to extract for by-reference embeddable since all references are stored with by-reference saved object
    return { state, references: [] };
  }

  // by-value embeddable
  const { attributes, references } = extractReferences({
    attributes: typedState.attributes as LinksAttributes,
  });

  return {
    state: {
      ...state,
      attributes,
    },
    references,
  };
};
