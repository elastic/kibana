/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectConfig } from '@kbn/saved-objects-plugin/public';
import { injectTagReferences } from './inject_tag_references';
import { extractTagReferences } from './extract_tag_references';

export const decorateConfig = (config: SavedObjectConfig) => {
  config.mapping = {
    ...config.mapping,
    __tags: 'text',
  };

  const initialExtractReferences = config.extractReferences;
  const initialInjectReferences = config.injectReferences;

  config.injectReferences = (object, references) => {
    if (initialInjectReferences) {
      initialInjectReferences(object, references);
    }
    injectTagReferences(object, references);
  };

  config.extractReferences = (attrsAndRefs) => {
    if (initialExtractReferences) {
      attrsAndRefs = initialExtractReferences(attrsAndRefs);
    }
    return extractTagReferences(attrsAndRefs);
  };
};
