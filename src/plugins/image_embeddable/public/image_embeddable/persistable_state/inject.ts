/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EmbeddableRegistryDefinition } from '@kbn/embeddable-plugin/common';
import { ImageFileSrc } from '../../types';
import { ImageEmbeddablePersistableState } from '../image_embeddable_factory';
import { getReferenceName } from './references';

export const inject: EmbeddableRegistryDefinition['inject'] = (state, references) => {
  const typedState = state as ImageEmbeddablePersistableState;
  const imageConfig = { ...typedState.imageConfig };

  const reference = references.find(({ name }) => name === getReferenceName(state.id));
  if (reference && imageConfig.src.type === 'file') {
    const fileSrc = imageConfig.src as ImageFileSrc;
    fileSrc.fileId = reference.id;
  }

  return { ...state, imageConfig };
};
