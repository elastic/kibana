/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { X_LABELS } from '../known_custom_props';
import { DocumentNodeProcessor } from '../types';

/**
 * Creates a node processor to exclude nodes having only one of provided tags.
 */
export function createExcludeXLabelsProcessor(labelsToExclude: string[]): DocumentNodeProcessor {
  const labelsToExcludeSet = new Set(labelsToExclude);

  return {
    shouldRemove(node) {
      if (!(X_LABELS in node) || !Array.isArray(node[X_LABELS])) {
        return false;
      }

      return node[X_LABELS].every((tag) => labelsToExcludeSet.has(tag));
    },
  };
}
