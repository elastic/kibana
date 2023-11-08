/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EmbeddableRegistryDefinition } from '@kbn/embeddable-plugin/common';
import { ImageEmbeddablePersistableState } from '../image_embeddable_factory';
import { getReferenceName } from './references';

export const extract: EmbeddableRegistryDefinition['extract'] = (state) => {
  const references = [];
  const { imageConfig } = state as ImageEmbeddablePersistableState;

  if (imageConfig?.src.type === 'file') {
    const refName = getReferenceName(state.id);
    references.push({ name: refName, type: 'file', id: imageConfig.src.fileId });

    return { state, references };
  }

  return { state, references: [] };
};
