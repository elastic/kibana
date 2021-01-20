/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { highlightTags } from './highlight_tags';

const FRAGMENT_SIZE = Math.pow(2, 31) - 1; // Max allowed value for fragment_size (limit of a java int)

export function getHighlightRequest(query: any, shouldHighlight: boolean) {
  if (!shouldHighlight) return;

  return {
    pre_tags: [highlightTags.pre],
    post_tags: [highlightTags.post],
    fields: {
      '*': {},
    },
    fragment_size: FRAGMENT_SIZE,
  };
}
