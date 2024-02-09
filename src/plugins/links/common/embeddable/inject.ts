/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EmbeddableRegistryDefinition,
  injectSavedObjectIdRef,
} from '@kbn/embeddable-plugin/common';
import { LinksAttributes } from '../content_management';
import { injectReferences } from '../persistable_state';
import { LinksPersistableState } from './types';

export const inject: EmbeddableRegistryDefinition['inject'] = (state, references) => {
  const typedState = state as LinksPersistableState;

  // by-reference embeddable
  if (!('attributes' in typedState) || typedState.attributes === undefined) {
    return injectSavedObjectIdRef(state, references);
  }

  // by-value embeddable
  try {
    const { attributes: attributesWithInjectedIds } = injectReferences({
      attributes: typedState.attributes as unknown as LinksAttributes,
      references,
    });

    return {
      ...typedState,
      attributes: attributesWithInjectedIds,
    };
  } catch (error) {
    // inject exception prevents entire dashboard from display
    // Instead of throwing, swallow error and let dashboard display
    // Errors will surface in links panel.
    // Users can then manually edit links to resolve any problems.
    return typedState;
  }
};
