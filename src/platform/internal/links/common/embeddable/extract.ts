/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EmbeddableRegistryDefinition } from '@kbn/embeddable-plugin/common';
import type { LinksAttributes } from '../content_management';
import { extractReferences } from '../persistable_state';
import { LinksPersistableState } from './types';

export const extract: EmbeddableRegistryDefinition['extract'] = (state) => {
  const typedState = state as LinksPersistableState;

  // by-reference embeddable
  if (!('attributes' in typedState) || typedState.attributes === undefined) {
    // No references to extract for by-reference embeddable since all references are stored with by-reference saved object
    return { state, references: [] };
  }

  // by-value embeddable
  const { attributes, references } = extractReferences({
    attributes: typedState.attributes as unknown as LinksAttributes,
  });

  return {
    state: {
      ...state,
      attributes,
    },
    references,
  };
};
